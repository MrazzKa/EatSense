import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { analyzeImage as analyzeImageAPI } from '../lib/api';
import { useI18n } from '../../app/i18n/hooks';

interface AnalysisFlowProps {
  onClose: () => void;
  onAnalysisComplete: (_result: any, _imageUri: string) => void;
  source?: 'camera' | 'gallery';
}

type AnalysisStep = 'select' | 'analyzing' | 'complete' | 'error';

export const AnalysisFlow: React.FC<AnalysisFlowProps> = ({ onClose, onAnalysisComplete, source = 'camera' }) => {
  const { t } = useI18n();
  const [step, setStep] = useState<AnalysisStep>('analyzing');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted') {
      setError(t('camera.permissionError') || 'Camera permission is required');
      setStep('error');
      return false;
    }

    if (mediaPermission.status !== 'granted') {
      setError(t('gallery.permissionRequired') || 'Media library permission is required');
      setStep('error');
      return false;
    }

    return true;
  }, [t]);

  const startAnalysis = useCallback(async (imageUri: string) => {
    setStep('analyzing');
    setError(null);

    try {
      const result = await analyzeImageAPI(imageUri);
      setStep('complete');
      onAnalysisComplete(result, imageUri);
    } catch (error: any) {
      console.error('Analysis error:', error);
      setError(error.message || 'Failed to analyze image');
      setStep('error');
    }
  }, [onAnalysisComplete]);

  const takePhoto = useCallback(async () => {
    if (!(await requestPermissions())) {
      onClose();
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        exif: false
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        await startAnalysis(asset.uri);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      setError('Failed to take photo');
      setStep('error');
    }
  }, [requestPermissions, onClose, startAnalysis]);

  const selectFromLibrary = useCallback(async () => {
    if (!(await requestPermissions())) {
      onClose();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        exif: false
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        await startAnalysis(asset.uri);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      setError('Failed to select image');
      setStep('error');
    }
  }, [requestPermissions, onClose, startAnalysis]);

  useEffect(() => {
    if (source === 'camera') {
      void takePhoto();
    } else if (source === 'gallery') {
      void selectFromLibrary();
    }
  }, [source, takePhoto, selectFromLibrary]);

  const getStepTitle = () => {
    switch (step) {
      case 'analyzing': return t('analysis.analyzing') || 'Analyzing your dish...';
      case 'complete': return t('analysis.analysisComplete') || 'Analysis complete!';
      case 'error': return t('analysis.errorTitle') || 'Analysis error';
      default: return '';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 'analyzing': return t('analysis.subtitle') || 'AI is identifying ingredients and calories';
      case 'complete': return t('analysis.savedMessage') || 'Your dish has been successfully analyzed';
      case 'error': return t('analysis.errorMessage') || 'Try again or select a different photo';
      default: return '';
    }
  };

  const renderAnalyzingStep = () => (
    <View style={styles.stepContent}>
      {selectedImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.analysisImage} />
          <View style={styles.imageOverlay}>
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color="#3498DB" />
              <Text style={styles.progressText}>{t('analysis.analyzing') || 'Analyzing...'}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.analysisSteps}>
        <View style={styles.analysisStep}>
          <View style={[styles.stepIcon, { backgroundColor: '#2ECC71' }]}>
            <Ionicons name="checkmark" size={20} color="white" />
          </View>
          <Text style={styles.stepText}>{t('analysis.uploaded') || 'Uploaded'}</Text>
        </View>

        <View style={styles.analysisStep}>
          <View style={[styles.stepIcon, { backgroundColor: '#3498DB' }]}>
            <ActivityIndicator size="small" color="white" />
          </View>
          <Text style={styles.stepText}>{t('analysis.analyzingStep') || 'Analyzing'}</Text>
        </View>

        <View style={styles.analysisStep}>
          <View style={[styles.stepIcon, { backgroundColor: '#BDC3C7' }]}>
            <Ionicons name="calculator" size={20} color="white" />
          </View>
          <Text style={styles.stepText}>{t('analysis.calculating') || 'Calculating'}</Text>
        </View>
      </View>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContent}>
      {selectedImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.analysisImage} />
          <View style={styles.successOverlay}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={32} color="#2ECC71" />
            </View>
          </View>
        </View>
      )}

      <View style={styles.completeInfo}>
        <Text style={styles.completeTitle}>{t('common.done') || 'Done!'}</Text>
        <Text style={styles.completeSubtitle}>
          {t('analysis.savedMessage') || 'Your dish has been successfully analyzed and added to your journal'}
        </Text>
      </View>
    </View>
  );

  const renderErrorStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#E74C3C" />
        <Text style={styles.errorTitle}>{t('analysis.errorTitle') || 'Analysis error'}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            if (source === 'camera') {
              void takePhoto();
            } else {
              void selectFromLibrary();
            }
          }}
        >
          <Text style={styles.retryButtonText}>{t('common.retry') || 'Try again'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>{getStepTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>{getStepSubtitle()}</Text>

        {step === 'analyzing' && renderAnalyzingStep()}
        {step === 'complete' && renderCompleteStep()}
        {step === 'error' && renderErrorStep()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#3498DB',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
  },
  stepContent: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  analysisImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 8,
  },
  analysisSteps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  analysisStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  completeInfo: {
    alignItems: 'center',
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ECC71',
    marginBottom: 10,
  },
  completeSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
