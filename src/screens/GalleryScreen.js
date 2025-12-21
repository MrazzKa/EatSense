import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { PADDING, SPACING } from '../utils/designConstants';
import { useI18n } from '../../app/i18n/hooks';
import { mapLanguageToLocale } from '../utils/locale';
import ApiService from '../services/apiService';

const STATE = {
  IDLE: 'idle',
  CHECKING: 'checking',
  READY: 'ready',
  DENIED: 'denied',
  LIMITED: 'limited',
  OPENING: 'opening',
  CANCELED: 'canceled',
  ERROR: 'error',
};

export default function GalleryScreen() {
  const navigation = useNavigation();
  const { language } = useI18n();
  const [state, setState] = useState(STATE.CHECKING);
  const [error, setError] = useState(null);
  const isOpeningRef = useRef(false);

  // On mount: check permissions only, don't auto-open
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
        
        if (permission.granted) {
          setState(STATE.READY);
        } else if (permission.status === 'limited') {
          setState(STATE.LIMITED);
        } else if (permission.canAskAgain) {
          // Can ask, but don't auto-request - let user click button
          setState(STATE.DENIED);
        } else {
          setState(STATE.DENIED);
        }
      } catch (error) {
        if (__DEV__) console.error('[GalleryScreen] Error checking permissions:', error);
        setState(STATE.ERROR);
        setError(String(error?.message ?? error));
      }
    };

    checkPermissions();
  }, []);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  const pickImage = useCallback(async () => {
    if (isOpeningRef.current) {
      if (__DEV__) console.log('[GalleryScreen] Picker already opening, skipping...');
      return;
    }

    isOpeningRef.current = true;
    setError(null);
    setState(STATE.OPENING);

    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isOpeningRef.current) {
        if (__DEV__) console.warn('[GalleryScreen] Timeout waiting for image picker, resetting state');
        isOpeningRef.current = false;
        setState(STATE.READY); // Reset to ready to allow retry
        setError('Timeout: Image picker took too long. Please try again.');
      }
    }, 15000); // 15 second timeout

    try {
      // Проверяем разрешения, но даже если denied - пробуем открыть пикер
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      // iOS странность: accessPrivileges="all" но granted=false - пробуем открыть
      const shouldTryOpen = permission.granted || 
        (Platform.OS === 'ios' && permission.accessPrivileges === 'all') ||
        permission.status === 'limited';
      
      if (!shouldTryOpen && permission.canAskAgain) {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      // Пробуем открыть пикер даже если разрешение denied (iOS может разрешить)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        selectionLimit: 1,
        exif: false,
      });

      clearTimeout(timeoutId); // Clear timeout on successful interaction

      if (result.canceled) {
        setState(STATE.CANCELED);
        isOpeningRef.current = false;
        // User canceled - close the screen
        if (navigation && typeof navigation.goBack === 'function') {
          navigation.goBack();
        }
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        clearTimeout(timeoutId);
        setState(STATE.ERROR);
        setError('No asset returned');
        isOpeningRef.current = false;
        return;
      }

      if (__DEV__) console.log('[GalleryScreen] Image selected, compressing...');
      
      // Compress the image
      const compressedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      clearTimeout(timeoutId);
      if (__DEV__) console.log('[GalleryScreen] Image compressed, starting analysis...');
      setState(STATE.READY);
      isOpeningRef.current = false;
      
      // Start analysis immediately without prompt
      await startAnalysis(compressedImage.uri);
    } catch (e) {
      clearTimeout(timeoutId);
      if (__DEV__) console.error('[GalleryScreen] Error picking image:', e);
      setState(STATE.ERROR);
      setError(String(e?.message ?? e));
      isOpeningRef.current = false;
    }
  }, [navigation]);

  // On mount: check permissions only, don't auto-open
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
        
        if (permission.granted) {
          setState(STATE.READY);
        } else if (permission.status === 'limited') {
          setState(STATE.LIMITED);
        } else if (permission.canAskAgain) {
          // Can ask, but don't auto-request - let user click button
          setState(STATE.DENIED);
        } else {
          setState(STATE.DENIED);
        }
      } catch (error) {
        if (__DEV__) console.error('[GalleryScreen] Error checking permissions:', error);
        setState(STATE.ERROR);
        setError(String(error?.message ?? error));
      }
    };

    checkPermissions();
  }, []);

  const handleOpenGallery = useCallback(async () => {
    if (isOpeningRef.current) {
      return;
    }

    // Check permission first
    let permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    if (!permission.granted && permission.canAskAgain) {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    const canProceed = permission.granted || 
      (Platform.OS === 'ios' && permission.accessPrivileges === 'all') ||
      permission.status === 'limited';

    if (!canProceed) {
      setState(STATE.DENIED);
      return;
    }

    // Now open gallery
    await pickImage();
  }, [pickImage]);

  const handleClose = () => {
    if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  };

  const startAnalysis = useCallback(async (imageUri) => {
    if (!imageUri) return;
    
    try {
      // Start background analysis immediately without prompt
      const locale = mapLanguageToLocale(language);
      
      if (__DEV__) {
        console.log('[GalleryScreen] Starting image analysis:', {
          hasImage: !!imageUri,
          locale,
        });
      }
      
      // Start analysis in background - it will appear in Diary
      const response = await ApiService.analyzeImage(imageUri, locale);
      
      if (__DEV__) {
        console.log('[GalleryScreen] Analysis response:', {
          hasAnalysisId: !!response?.analysisId,
          hasItems: !!response?.items,
          status: response?.status,
          responseKeys: response ? Object.keys(response) : [],
          fullResponse: response,
        });
      }
      
      // If analysis returns immediately with result, it will be saved automatically
      // If it returns analysisId, it will be tracked via getActiveAnalyses
      // Either way, navigate to Dashboard - analysis will show in Diary
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('MainTabs', { screen: 'Dashboard' });
      }
    } catch (error) {
      console.error('[GalleryScreen] Error starting background analysis:', error);
      if (__DEV__) {
        console.error('[GalleryScreen] Error details:', {
          message: error?.message,
          stack: error?.stack,
        });
      }
      // On error, still navigate to dashboard - user can retry
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('MainTabs', { screen: 'Dashboard' });
      }
    }
  }, [language, navigation]);

  const renderContent = () => {
    if (state === STATE.CHECKING || state === STATE.OPENING) {
      return (
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {state === STATE.CHECKING ? 'Checking permissions...' : 'Opening gallery...'}
          </Text>
        </View>
      );
    }

    if (state === STATE.READY || state === STATE.LIMITED) {
      return (
        <View style={styles.content}>
          <Ionicons name="images-outline" size={64} color="#007AFF" />
          <Text style={styles.permissionTitle}>Select Photo from Gallery</Text>
          <Text style={styles.permissionText}>
            Tap the button below to open your photo library and select an image of your meal.
          </Text>
          <TouchableOpacity style={styles.pickButton} onPress={handleOpenGallery}>
            <Ionicons name="folder-open-outline" size={24} color="#FFFFFF" />
            <Text style={styles.pickButtonText}>Open Gallery</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (state === STATE.DENIED) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="images-outline" size={64} color="#8E8E93" />
          <Text style={styles.permissionTitle}>Gallery Access Required</Text>
          <Text style={styles.permissionText}>
            Please enable photo library access in your device settings to select photos of your meals.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleOpenGallery}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderWidth: 1, borderColor: '#007AFF' }]} onPress={openSettings}>
            <Text style={[styles.secondaryButtonText, { color: '#007AFF' }]}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderWidth: 1, borderColor: '#8E8E93', marginTop: 8 }]} onPress={handleClose}>
            <Text style={[styles.secondaryButtonText, { color: '#8E8E93' }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (state === STATE.ERROR) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.permissionTitle}>Error</Text>
          <Text style={styles.permissionText}>{error || 'Failed to open gallery'}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={pickImage}>
            <Text style={styles.permissionButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // READY, LIMITED states - show button to open gallery
    if (state === STATE.READY || state === STATE.LIMITED) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="images-outline" size={64} color="#007AFF" />
          <Text style={styles.permissionTitle}>Select Photo</Text>
          <Text style={styles.permissionText}>
            Choose a photo from your gallery to analyze.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleOpenGallery}>
            <Text style={styles.permissionButtonText}>Open Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderWidth: 1, borderColor: '#8E8E93', marginTop: 8 }]} onPress={handleClose}>
            <Text style={[styles.secondaryButtonText, { color: '#8E8E93' }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // CANCELED state
    if (state === STATE.CANCELED) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="close-circle-outline" size={64} color="#8E8E93" />
          <Text style={styles.permissionTitle}>Selection Canceled</Text>
          <Text style={styles.permissionText}>
            You canceled photo selection.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleOpenGallery}>
            <Text style={styles.permissionButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderWidth: 1, borderColor: '#8E8E93', marginTop: 8 }]} onPress={handleClose}>
            <Text style={[styles.secondaryButtonText, { color: '#8E8E93' }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Photo</Text>
        <View style={styles.headerButton} />
      </View>
      
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING.screen,
    paddingVertical: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: PADDING.screen,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: PADDING.huge,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  messageContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center',
  },
});
