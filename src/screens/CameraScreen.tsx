// @ts-nocheck
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { clientLog } from '../utils/clientLog';
import DescribeFoodModal from '../components/DescribeFoodModal';
import ApiService from '../services/apiService';
import { mapLanguageToLocale } from '../utils/locale';
import { useAnalysis } from '../contexts/AnalysisContext';

export default function CameraScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const { tokens } = useTheme();
  const { t, language } = useI18n();
  const { addPendingAnalysis } = useAnalysis();
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef(null);
  const [facing, setFacing] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const [showDescribeModal, setShowDescribeModal] = useState(false);

  // Camera always has black background — text/icons must always be white
  // regardless of theme (dark theme has onPrimary: '#0B1120' which is invisible on black)
  const CAM_TEXT = '#FFFFFF';

  // Zoom state (plain React state — no reanimated to avoid native crash with CameraView)
  const [zoomValue, setZoomValue] = useState(0);
  const zoomRef = useRef(0);
  const baseZoomRef = useRef(0);

  // Keep ref in sync with state for gesture callbacks
  useEffect(() => { zoomRef.current = zoomValue; }, [zoomValue]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onStart(() => {
      baseZoomRef.current = zoomRef.current;
    })
    .onUpdate((e) => {
      const delta = (e.scale - 1);
      const newZoom = Math.min(Math.max(baseZoomRef.current + delta * 0.5, 0), 1);
      zoomRef.current = newZoom;
      setZoomValue(newZoom);
    }), []);

  // Safe requestPermission wrapper
  const handleRequestPermission = async () => {
    if (requestPermission && typeof requestPermission === 'function') {
      try {
        await clientLog('Camera:requestPermissionStart').catch(() => { });
        const result = await requestPermission();
        await clientLog('Camera:requestPermissionResult', {
          granted: result?.granted || false,
          status: result?.status || 'unknown',
        }).catch(() => { });
      } catch (error) {
        await clientLog('Camera:requestPermissionError', {
          message: error?.message || String(error),
        }).catch(() => { });
        Alert.alert(
          t('common.error') || 'Error',
          t('camera.permissionError') || 'Failed to request camera permission'
        );
      }
    } else {
      await clientLog('Camera:requestPermissionNotFunction').catch(() => { });
      Alert.alert(
        t('common.error') || 'Error',
        'Camera permission function not available'
      );
    }
  };
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  const takePicture = async () => {
    if (!cameraRef.current || isLoading) {
      await clientLog('Camera:takePictureNoRef').catch(() => { });
      return;
    }

    // Check if takePictureAsync exists
    if (typeof cameraRef.current.takePictureAsync !== 'function') {
      await clientLog('Camera:takePictureAsyncNotFunction').catch(() => { });
      Alert.alert(t('common.error') || 'Error', t('camera.captureError') || 'Camera function not available');
      return;
    }

    setIsLoading(true);
    try {
      await clientLog('Camera:takePictureStart').catch(() => { });

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo || !photo.uri) {
        throw new Error('Photo capture returned invalid result');
      }

      // Compress the image - use new SDK-55 object-oriented API
      let compressedImage = photo;
      if (ImageManipulator) {
        try {
          if (ImageManipulator.ImageManipulator && typeof ImageManipulator.ImageManipulator.manipulate === 'function') {
            const context = ImageManipulator.ImageManipulator.manipulate(photo.uri);
            context.resize({ width: 1024 });
            const imageRef = await context.renderAsync();
            compressedImage = await imageRef.saveAsync({ compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
          } else if (typeof ImageManipulator.manipulateAsync === 'function') {
            compressedImage = await ImageManipulator.manipulateAsync(
              photo.uri,
              [{ resize: { width: 1024 } }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
            );
          }
        } catch (compressError) {
          console.warn('[CameraScreen] Image compression failed, using original:', compressError);
          compressedImage = photo;
        }
      }

      await clientLog('Camera:photoTaken', {
        width: compressedImage.width || 0,
        height: compressedImage.height || 0,
        uri: compressedImage.uri ? 'present' : 'missing',
      }).catch(() => { });

      // Start analysis immediately without prompt
      await startAnalysis(compressedImage.uri);
    } catch (error) {
      if (__DEV__) console.error('[CameraScreen] Error taking picture:', error);
      await clientLog('Camera:takePictureError', {
        message: error?.message || String(error),
        stack: String(error?.stack || '').substring(0, 500),
      }).catch(() => { });
      Alert.alert(
        t('common.error') || 'Error',
        t('camera.captureError') || 'Failed to take picture. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlashToggle = () => {
    const modes = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
  };

  const flashLabel = useMemo(() => {
    switch (flashMode) {
      case 'on':
        return t('camera.flashModeOn');
      case 'auto':
        return t('camera.flashModeAuto');
      default:
        return t('camera.flashModeOff');
    }
  }, [flashMode, t]);

  const handleClose = () => {
    if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  };

  const handleDescribeFoodCompleted = (analysisId) => {
    // Add to pending analyses so it appears as processing card on Dashboard
    if (analysisId) {
      addPendingAnalysis(analysisId);
    }
    setShowDescribeModal(false);
    // Navigate to Dashboard where the processing card will show
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  };

  const handleGalleryPick = async () => {
    try {
      let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        selectionLimit: 1,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setIsLoading(true);
      const asset = result.assets[0];
      let compressed = asset;
      if (ImageManipulator) {
        try {
          if (ImageManipulator.ImageManipulator && typeof ImageManipulator.ImageManipulator.manipulate === 'function') {
            const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
            context.resize({ width: 1600 });
            const imageRef = await context.renderAsync();
            compressed = await imageRef.saveAsync({ compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
          } else if (typeof ImageManipulator.manipulateAsync === 'function') {
            compressed = await ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: 1600 } }],
              { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );
          }
        } catch {
          compressed = asset;
        }
      }
      await startAnalysis(compressed.uri);
    } catch (error) {
      console.error('[CameraScreen] Gallery error:', error);
      if (error?.response?.status === 429 || error?.status === 429) {
        Alert.alert(
          t('errors.limitReachedTitle') || 'Daily Limit Reached',
          t('errors.limitReachedMessage') || 'You have reached your daily scan limit.'
        );
      } else {
        Alert.alert(t('common.error') || 'Error', t('errors.galleryFailed') || 'Failed to open gallery.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startAnalysis = useCallback(async (imageUri) => {
    if (!imageUri) return;

    try {
      // Start background analysis immediately without prompt
      const locale = mapLanguageToLocale(language);

      if (__DEV__) {
        console.log('[CameraScreen] Starting image analysis:', {
          hasImage: !!imageUri,
          locale,
        });
      }

      // Start analysis in background - it will appear in Diary
      const response = await ApiService.analyzeImage(imageUri, locale);

      if (__DEV__) {
        console.log('[CameraScreen] Analysis response:', {
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
      console.error('[CameraScreen] Error starting background analysis:', error);
      if (error?.response?.status === 429 || error?.status === 429) {
        Alert.alert(
          t('errors.limitReachedTitle') || 'Daily Limit Reached',
          t('errors.limitReachedMessage') || 'You have reached your daily scan limit. Upgrade to get unlimited scans.'
        );
        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('MainTabs', { screen: 'Dashboard' });
        }
        return;
      }
      // Show error to user, then navigate to dashboard
      Alert.alert(
        t('common.error') || 'Error',
        error?.message || t('errors.analysisFailed') || 'Analysis failed. Please try again.',
      );
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('MainTabs', { screen: 'Dashboard' });
      }
    } finally {
      // setCapturedImageUri(null); // State removed
    }
  }, [language, navigation, addPendingAnalysis]);

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tokens.colors.background }]}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <Text style={[styles.permissionText, { color: tokens.colors.textSecondary }]}>
            {t('camera.requestingPermission')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: tokens.colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off" size={64} color={tokens.colors.iconMuted} />
          <Text style={[styles.permissionTitle, { color: tokens.colors.textPrimary }]}>
            {t('camera.accessTitle')}
          </Text>
          <Text style={[styles.permissionText, { color: tokens.colors.textSecondary }]}>
            {t('camera.accessBody')}
          </Text>
          <Pressable
            style={[styles.permissionButton, { backgroundColor: tokens.colors.primary }]}
            onPress={handleRequestPermission}
          >
            <Text style={[styles.permissionButtonText, { color: tokens.colors.onPrimary }]}>
              {t('camera.requestPermission')}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.permissionButton,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                marginTop: tokens.spacing.sm,
              },
            ]}
            onPress={handleClose}
          >
            <Text style={[styles.permissionButtonText, { color: tokens.colors.textPrimary }]}>
              {t('common.back')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <GestureDetector gesture={pinchGesture}>
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            ref={cameraRef}
            zoom={zoomValue}
            enableZoomGesture={false}
            flash={flashMode}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.75)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={[styles.cameraOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]} pointerEvents="box-none">
              <View
                style={[styles.header, { paddingTop: tokens.spacing.lg }]}
              >
                <Pressable style={styles.headerButton} onPress={typeof handleClose === 'function' ? handleClose : () => { }}>
                  <Ionicons name="close" size={24} color={CAM_TEXT} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: CAM_TEXT }]}>{t('camera.takePhoto')}</Text>
                <View style={styles.headerButtonPlaceholder} />
              </View>

              <View
                style={[styles.controls, { paddingBottom: tokens.spacing.xl }]}
              >
                <View style={styles.controlRow}>
                  <Pressable style={styles.controlButton} onPress={typeof handleFlashToggle === 'function' ? handleFlashToggle : () => { }}>
                    <Ionicons
                      name={
                        flashMode === 'off' ? 'flash-off' : flashMode === 'on' ? 'flash' : 'flash-outline'
                      }
                      size={24}
                      color={CAM_TEXT}
                    />
                    <Text style={[styles.controlLabel, { color: CAM_TEXT }]}>{flashLabel}</Text>
                  </Pressable>

                  <View style={styles.captureWrapper}>
                    <Pressable
                      style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
                      onPress={typeof takePicture === 'function' ? takePicture : () => { }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={CAM_TEXT} />
                      ) : (
                        <View style={[styles.captureButtonInner, { backgroundColor: tokens.colors.primary }]} />
                      )}
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.controlButton}
                    onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                  >
                    <Ionicons name="camera-reverse" size={24} color={CAM_TEXT} />
                    <Text style={[styles.controlLabel, { color: CAM_TEXT }]}>
                      {t('camera.switchCamera')}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.bottomActions}>
                  <Pressable
                    style={styles.typeButton}
                    onPress={handleGalleryPick}
                    disabled={isLoading}
                  >
                    <Ionicons name="images-outline" size={20} color={CAM_TEXT} />
                    <Text style={[styles.typeButtonText, { color: CAM_TEXT }]}>
                      {t('camera.gallery') || 'Gallery'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.typeButton}
                    onPress={() => setShowDescribeModal(true)}
                    disabled={isLoading}
                  >
                    <Ionicons name="create-outline" size={20} color={CAM_TEXT} />
                    <Text style={[styles.typeButtonText, { color: CAM_TEXT }]}>
                      {t('camera.typeInstead') || 'Type instead'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </CameraView>
        </View>
      </GestureDetector>

      <DescribeFoodModal
        visible={showDescribeModal}
        onClose={() => setShowDescribeModal(false)}
        onAnalysisCompleted={handleDescribeFoodCompleted}
      />

    </View>
  );
}

const createStyles = (tokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
      paddingHorizontal: tokens.spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: tokens.spacing.lg,
    },
    headerButton: {
      width: 44,
      height: 44,
      borderRadius: tokens.radii.full,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerButtonPlaceholder: {
      width: 44,
      height: 44,
    },
    headerTitle: {
      fontSize: tokens.typography.headingS.fontSize,
      fontWeight: tokens.typography.headingS.fontWeight,
      letterSpacing: 0.4,
    },
    controls: {
      gap: tokens.spacing.lg,
    },
    controlRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: tokens.spacing.lg,
    },
    controlButton: {
      width: 72,
      borderRadius: tokens.radii.lg,
      paddingVertical: tokens.spacing.xs,
      alignItems: 'center',
      gap: tokens.spacing.xs,
      backgroundColor: 'rgba(15,23,42,0.32)',
    },
    controlLabel: {
      fontSize: tokens.typography.micro.fontSize,
    },
    captureWrapper: {
      borderRadius: tokens.radii.full,
    },
    captureButton: {
      width: 86,
      height: 86,
      borderRadius: tokens.radii.full,
      backgroundColor: 'rgba(255,255,255,0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.45)',
    },
    captureButtonInner: {
      width: 64,
      height: 64,
      borderRadius: tokens.radii.full,
    },
    captureButtonDisabled: {
      opacity: 0.6,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.xxxl,
      gap: tokens.spacing.lg,
    },
    permissionTitle: {
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      textAlign: 'center',
    },
    permissionText: {
      fontSize: tokens.typography.body.fontSize,
      lineHeight: tokens.typography.body.lineHeight,
      textAlign: 'center',
    },
    permissionButton: {
      minWidth: 160,
      borderRadius: tokens.radii.md,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permissionButtonText: {
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    bottomActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: tokens.spacing.md,
      marginTop: tokens.spacing.sm,
      paddingBottom: tokens.spacing.sm,
    },
    typeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
      backgroundColor: 'rgba(15,23,42,0.32)',
      borderRadius: tokens.radii.lg,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
    },
    typeButtonText: {
      fontSize: tokens.typography.body.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
  });
