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
import { useAnalysis } from '../contexts/AnalysisContext';

const STATE = {
  IDLE: 'idle',
  CHECKING: 'checking',
  READY: 'ready',
  DENIED: 'denied',
  LIMITED: 'limited',
  OPENING: 'opening',
  OPENING_TIMEOUT: 'opening_timeout', // Added: when picker takes too long
  CANCELED: 'canceled',
  ERROR: 'error',
};

// Timeout for image picker - if it doesn't respond, show manual button
const PICKER_TIMEOUT_MS = 3000;

export default function GalleryScreen() {
  const navigation = useNavigation();
  const { language } = useI18n();
  const { addPendingAnalysis } = useAnalysis();
  const [state, setState] = useState(STATE.READY); // Start with READY - show button immediately
  const [error, setError] = useState(null);
  const isOpeningRef = useRef(false);
  const pickerTimeoutRef = useRef(null);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

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
        });
      }

      // Add to pending analyses for processing card display
      if (response?.analysisId) {
        addPendingAnalysis(response.analysisId, imageUri);
      }

      // Navigate to Dashboard - analysis will show in Diary as processing card
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('MainTabs', { screen: 'Dashboard' });
      }
    } catch (error) {
      console.error('[GalleryScreen] Error starting background analysis:', error);
      // On error, still navigate to dashboard - user can retry
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('MainTabs', { screen: 'Dashboard' });
      }
    }
  }, [language, navigation, addPendingAnalysis]);

  const pickImage = useCallback(async () => {
    if (isOpeningRef.current) {
      if (__DEV__) console.log('[GalleryScreen] Picker already opening, skipping...');
      return;
    }

    isOpeningRef.current = true;
    setError(null);
    setState(STATE.OPENING);

    // Set timeout - if picker doesn't respond in time, show manual button
    if (pickerTimeoutRef.current) {
      clearTimeout(pickerTimeoutRef.current);
    }
    pickerTimeoutRef.current = setTimeout(() => {
      if (isOpeningRef.current) {
        if (__DEV__) console.log('[GalleryScreen] Picker timeout - showing manual button');
        setState(STATE.OPENING_TIMEOUT);
      }
    }, PICKER_TIMEOUT_MS);

    try {
      // Check permissions, but still try to open picker even if denied
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();

      // iOS quirk: accessPrivileges="all" but granted=false - try to open anyway
      const shouldTryOpen = permission.granted ||
        (Platform.OS === 'ios' && permission.accessPrivileges === 'all') ||
        permission.status === 'limited';

      if (!shouldTryOpen && permission.canAskAgain) {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      // Clear timeout since picker is responding
      if (pickerTimeoutRef.current) {
        clearTimeout(pickerTimeoutRef.current);
        pickerTimeoutRef.current = null;
      }

      // Try to open picker even if permission denied (iOS may allow)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        selectionLimit: 1,
        exif: false,
      });



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
        setState(STATE.ERROR);
        setError('No asset returned');
        isOpeningRef.current = false;
        return;
      }

      if (__DEV__) console.log('[GalleryScreen] Image selected, compressing...');

      // Compress the image - use higher quality for better AI analysis
      const compressedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      if (__DEV__) console.log('[GalleryScreen] Image compressed, starting analysis...');
      setState(STATE.READY);
      isOpeningRef.current = false;

      // Start analysis immediately without prompt
      await startAnalysis(compressedImage.uri);
    } catch (e) {

      if (__DEV__) console.error('[GalleryScreen] Error picking image:', e);
      setState(STATE.ERROR);
      setError(String(e?.message ?? e));
      isOpeningRef.current = false;
    }
  }, [navigation, startAnalysis]);

  // On mount: check permissions and auto-open gallery immediately
  // No delay, no intermediate screen - open gallery directly
  useEffect(() => {
    const checkAndOpenGallery = async () => {
      try {
        // Check current permission status
        let permission = await ImagePicker.getMediaLibraryPermissionsAsync();

        // If permission not granted and we can ask, request it first
        if (!permission.granted && permission.canAskAgain) {
          permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        }

        const hasPermission = permission.granted ||
          (Platform.OS === 'ios' && permission.accessPrivileges === 'all') ||
          permission.status === 'limited';

        if (hasPermission) {
          // Open gallery immediately - no intermediate screen
          pickImage();
        } else if (permission.canAskAgain) {
          // Will ask for permission when user taps the button
          setState(STATE.READY);
        } else {
          setState(STATE.DENIED);
        }
      } catch (error) {
        if (__DEV__) console.error('[GalleryScreen] Error checking permissions:', error);
        setState(STATE.ERROR);
        setError(String(error?.message ?? error));
      }
    };

    checkAndOpenGallery();
  }, [pickImage]); // Add pickImage as dependency

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pickerTimeoutRef.current) {
        clearTimeout(pickerTimeoutRef.current);
      }
    };
  }, []);

  const handleOpenGallery = useCallback(async () => {
    // Always allow retry - reset the ref
    isOpeningRef.current = false;

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

    // Timeout state - picker took too long, show manual button
    if (state === STATE.OPENING_TIMEOUT) {
      return (
        <View style={styles.content}>
          <Ionicons name="images-outline" size={64} color="#007AFF" />
          <Text style={styles.permissionTitle}>Gallery Not Responding</Text>
          <Text style={styles.permissionText}>
            The photo picker is taking too long. Tap the button below to try again.
          </Text>
          <TouchableOpacity style={styles.pickButton} onPress={handleOpenGallery}>
            <Ionicons name="folder-open-outline" size={24} color="#FFFFFF" />
            <Text style={styles.pickButtonText}>Open Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderWidth: 1, borderColor: '#8E8E93', marginTop: 12 }]} onPress={handleClose}>
            <Text style={[styles.secondaryButtonText, { color: '#8E8E93' }]}>Go Back</Text>
          </TouchableOpacity>
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
