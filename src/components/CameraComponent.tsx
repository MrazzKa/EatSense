// src/components/CameraComponent.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  CameraView,
  type CameraType,
  useCameraPermissions,
} from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface CameraComponentProps {
  onPhotoTaken: (_uri: string) => void;
  onClose: () => void;
}

export const CameraComponent: React.FC<CameraComponentProps> = ({
  onPhotoTaken,
  onClose,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('auto');
  const cameraRef = useRef<CameraView | null>(null);

  const ensurePermission = useCallback(async () => {
    try {
      if (!permission || permission.status !== 'granted') {
        const result = await requestPermission();
        if (!result?.granted) {
          Alert.alert(t('permissions.required'), t('permissions.cameraRequired'));
        }
      }
    } catch (error) {
      console.error('[CameraComponent] request permission error:', error);
      Alert.alert(t('common.error'), t('errors.cameraPermission'));
    }
  }, [permission, requestPermission, t]);

  useEffect(() => {
    void ensurePermission();
  }, [ensurePermission]);

  const takePicture = async () => {
    if (!cameraRef.current) {
      console.warn('[CameraComponent] cameraRef is null');
      return;
    }

    // В новом API у CameraView тоже есть takePictureAsync
    if (typeof cameraRef.current.takePictureAsync !== 'function') {
      console.warn('[CameraComponent] takePictureAsync is not a function');
      Alert.alert(t('common.error'), t('errors.cameraNotAvailable'));
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo || !photo.uri) {
        throw new Error('Invalid photo result');
      }

      if (onPhotoTaken && typeof onPhotoTaken === 'function') {
        onPhotoTaken(photo.uri);
      }
    } catch (error) {
      console.error('[CameraComponent] Error taking picture:', error);
      Alert.alert(t('common.error'), t('errors.takePictureFailed'));
    }
  };

  const flipCamera = () => {
    setType((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlashMode((current) => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const renderPermissionFallback = (message: string) => (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.message, { color: colors.textPrimary }]}>
        {message}
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (onClose && typeof onClose === 'function') {
            onClose();
          }
        }}
      >
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
          {t('common.close')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!permission) {
    return renderPermissionFallback(t('common.loading'));
  }

  if (!permission.granted) {
    return renderPermissionFallback(t('permissions.cameraRequired'));
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CameraView
        style={styles.camera}
        facing={type}
        ref={cameraRef}
        flash={flashMode}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.topControls,
              { paddingTop: insets.top + 12 },
            ]}
          >
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                if (onClose && typeof onClose === 'function') {
                  onClose();
                }
              }}
            >
              <Ionicons name="close" size={24} color={colors.onPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              <Ionicons
                name={
                  flashMode === 'off'
                    ? 'flash-off'
                    : flashMode === 'on'
                      ? 'flash'
                      : 'flash'
                }
                size={24}
                color={colors.onPrimary}
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.bottomControls,
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
              <Ionicons name="camera-reverse" size={24} color={colors.onPrimary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
  },
  placeholder: {
    width: 44,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
