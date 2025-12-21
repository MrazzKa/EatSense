import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
// Note: we intentionally avoid react-native-reanimated here to reduce
// chances of runtime issues in production builds. No custom animations.
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { clientLog } from '../utils/clientLog';
import DescribeFoodModal from '../components/DescribeFoodModal';
import ApiService from '../services/apiService';
import { mapLanguageToLocale } from '../utils/locale';

export default function CameraScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const { tokens } = useTheme();
  const { t, language } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef(null);
  const [zoom, setZoom] = useState(0);
  const [facing, setFacing] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const [showDescribeModal, setShowDescribeModal] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  
  // Safe requestPermission wrapper
  const handleRequestPermission = async () => {
    if (requestPermission && typeof requestPermission === 'function') {
      try {
        await clientLog('Camera:requestPermissionStart').catch(() => {});
        const result = await requestPermission();
        await clientLog('Camera:requestPermissionResult', {
          granted: result?.granted || false,
          status: result?.status || 'unknown',
        }).catch(() => {});
      } catch (error) {
        await clientLog('Camera:requestPermissionError', {
          message: error?.message || String(error),
        }).catch(() => {});
        Alert.alert(
          t('common.error') || 'Error',
          t('camera.permissionError') || 'Failed to request camera permission'
        );
      }
    } else {
      await clientLog('Camera:requestPermissionNotFunction').catch(() => {});
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
      await clientLog('Camera:takePictureNoRef').catch(() => {});
      return;
    }

    // Check if takePictureAsync exists
    if (typeof cameraRef.current.takePictureAsync !== 'function') {
      await clientLog('Camera:takePictureAsyncNotFunction').catch(() => {});
      Alert.alert(t('common.error') || 'Error', t('camera.captureError') || 'Camera function not available');
      return;
    }

    setIsLoading(true);
    try {
      await clientLog('Camera:takePictureStart').catch(() => {});
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo || !photo.uri) {
        throw new Error('Photo capture returned invalid result');
      }

      // Compress the image - check if ImageManipulator.manipulateAsync exists
      let compressedImage = photo;
      if (ImageManipulator && typeof ImageManipulator.manipulateAsync === 'function') {
        try {
          compressedImage = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
          );
        } catch (compressError) {
          console.warn('[CameraScreen] Image compression failed, using original:', compressError);
          // Use original photo if compression fails
          compressedImage = photo;
        }
      }

      await clientLog('Camera:photoTaken', {
        width: compressedImage.width || 0,
        height: compressedImage.height || 0,
        uri: compressedImage.uri ? 'present' : 'missing',
      }).catch(() => {});

      // Start analysis immediately without prompt
      await startAnalysis(compressedImage.uri);
    } catch (error) {
      if (__DEV__) console.error('[CameraScreen] Error taking picture:', error);
      await clientLog('Camera:takePictureError', {
        message: error?.message || String(error),
        stack: String(error?.stack || '').substring(0, 500),
      }).catch(() => {});
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

  const handleDescribeFood = (description) => {
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('AnalysisResults', {
        description,
        source: 'text',
      });
    }
    setShowDescribeModal(false);
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
          responseKeys: response ? Object.keys(response) : [],
        });
      }
      
      // If analysis returns immediately with result, it will be saved automatically
      // If it returns analysisId, it will be tracked via getActiveAnalyses
      // Either way, navigate to Dashboard - analysis will show in Diary
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('MainTabs', { screen: 'Dashboard' });
      }
    } catch (error) {
      console.error('[CameraScreen] Error starting background analysis:', error);
      // On error, still navigate to dashboard - user can retry
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('MainTabs', { screen: 'Dashboard' });
      }
    } finally {
      setCapturedImageUri(null);
    }
  }, [language, navigation]);

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
      <CameraView style={StyleSheet.absoluteFill} facing={facing} ref={cameraRef} zoom={zoom} enableZoomGesture flash={flashMode}>
        <LinearGradient
          colors={['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.cameraOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View
            style={[styles.header, { paddingTop: tokens.spacing.lg }]}
          >
            <Pressable style={styles.headerButton} onPress={typeof handleClose === 'function' ? handleClose : () => {}}>
              <Ionicons name="close" size={24} color={tokens.colors.onPrimary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: tokens.colors.onPrimary }]}>{t('camera.takePhoto')}</Text>
            <View style={styles.headerButtonPlaceholder} />
          </View>

          <View
            style={[styles.controls, { paddingBottom: tokens.spacing.xl }]}
          >
            <View style={styles.controlRow}>
              <Pressable style={styles.controlButton} onPress={typeof handleFlashToggle === 'function' ? handleFlashToggle : () => {}}>
                <Ionicons
                  name={
                    flashMode === 'off' ? 'flash-off' : flashMode === 'on' ? 'flash' : 'flash-outline'
                  }
                  size={24}
                  color={tokens.colors.onPrimary}
                />
                <Text style={[styles.controlLabel, { color: tokens.colors.onPrimary }]}>{flashLabel}</Text>
              </Pressable>

              <View style={styles.captureWrapper}>
                <Pressable
                  style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
                  onPress={typeof takePicture === 'function' ? takePicture : () => {}}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={tokens.colors.onPrimary} />
                  ) : (
                    <View style={[styles.captureButtonInner, { backgroundColor: tokens.colors.primary }]} />
                  )}
                </Pressable>
              </View>

              <Pressable
                style={styles.controlButton}
                onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
              >
                <Ionicons name="camera-reverse" size={24} color={tokens.colors.onPrimary} />
                <Text style={[styles.controlLabel, { color: tokens.colors.onPrimary }]}>
                  {t('camera.switchCamera')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.zoomContainer}>
              <Text style={[styles.zoomLabel, { color: tokens.colors.onPrimary }]}>
                {t('camera.zoomLabel', { value: (1 + zoom).toFixed(1) })}
              </Text>
              <Slider
                style={styles.zoomSlider}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                value={zoom}
                minimumTrackTintColor={tokens.colors.onPrimary}
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor={tokens.colors.primary}
                onValueChange={setZoom}
              />
            </View>

            <Pressable
              style={styles.typeButton}
              onPress={() => setShowDescribeModal(true)}
            >
              <Ionicons name="create-outline" size={20} color={tokens.colors.onPrimary} />
              <Text style={[styles.typeButtonText, { color: tokens.colors.onPrimary }]}>
                {t('camera.typeInstead') || 'Type instead'}
              </Text>
            </Pressable>
          </View>
        </View>
      </CameraView>

      <DescribeFoodModal
        visible={showDescribeModal}
        onClose={() => setShowDescribeModal(false)}
        onAnalyze={handleDescribeFood}
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
    zoomContainer: {
      gap: tokens.spacing.sm,
      backgroundColor: 'rgba(15,23,42,0.32)',
      borderRadius: tokens.radii.lg,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.md,
    },
    zoomLabel: {
      fontSize: tokens.typography.caption.fontSize,
      fontWeight: tokens.typography.caption.fontWeight,
      textAlign: 'center',
    },
    zoomSlider: {
      width: '100%',
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
    typeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
      backgroundColor: 'rgba(15,23,42,0.32)',
      borderRadius: tokens.radii.lg,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      marginTop: tokens.spacing.md,
    },
    typeButtonText: {
      fontSize: tokens.typography.body.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
  });
