import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyzeImage } from '../lib/api';
import { useI18n } from '../../app/i18n/hooks';
import { mapLanguageToLocale } from '../utils/locale';

interface AnalysisComponentProps {
  imageUri: string;
  onAnalysisComplete: (_result: any) => void;
  onClose: () => void;
}

export const AnalysisComponent: React.FC<AnalysisComponentProps> = ({
  imageUri,
  onAnalysisComplete,
  onClose,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { language, t } = useI18n();

  const startAnalysis = React.useCallback(async () => {
    try {
      const result = await analyzeImage(imageUri, mapLanguageToLocale(language));
      setProgress(100);
      setIsAnalyzing(false);
      if (typeof onAnalysisComplete === 'function') {
        onAnalysisComplete(result);
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      setError(error.message || 'Failed to analyze image');
      setIsAnalyzing(false);
    }
  }, [imageUri, onAnalysisComplete, language]);

  useEffect(() => {
    void startAnalysis();
  }, [startAnalysis]);

  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          if (newProgress >= 90) {
            clearInterval(interval);
            return 90;
          }
          return newProgress;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const retryAnalysis = () => {
    setError(null);
    setIsAnalyzing(true);
    setProgress(0);
    void startAnalysis();
  };

  const getAnalysisSteps = () => [
    { id: 'upload', label: t('analysisComponent.uploaded') || 'Uploaded', completed: true },
    { id: 'analyzing', label: t('analysisComponent.analyzing') || 'Analyzing', completed: !isAnalyzing },
    { id: 'calculating', label: t('analysisComponent.calculatingCalories') || 'Calculating calories', completed: !isAnalyzing },
  ];

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => onClose && typeof onClose === 'function' ? onClose() : null}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('analysisComponent.analysisError') || 'Analysis Error'}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#E74C3C" />
            <Text style={styles.errorTitle}>{t('analysisComponent.analysisFailed') || 'Analysis failed'}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={retryAnalysis}>
              <Text style={styles.retryButtonText}>{t('analysisComponent.tryAgain') || 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => onClose && typeof onClose === 'function' ? onClose() : null}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isAnalyzing ? (t('analysisComponent.analyzingDish') || 'Analyzing your dish...') : (t('analysisComponent.analysisComplete') || 'Analysis complete!')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          {isAnalyzing && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#3498DB" />
              <Text style={styles.overlayText}>{t('analysisComponent.analyzing') || 'Analyzing...'}</Text>
            </View>
          )}
        </View>

        <View style={styles.stepsContainer}>
          {getAnalysisSteps().map((step, _index) => (
            <View key={step.id} style={styles.step}>
              <View style={[
                styles.stepIcon,
                { backgroundColor: step.completed ? '#2ECC71' : '#BDC3C7' }
              ]}>
                {step.completed ? (
                  <Ionicons name="checkmark" size={20} color="white" />
                ) : (
                  <ActivityIndicator size="small" color="white" />
                )}
              </View>
              <Text style={styles.stepLabel}>{step.label}</Text>
            </View>
          ))}
        </View>

        {isAnalyzing && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C3E50',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  stepsContainer: {
    marginBottom: 30,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepLabel: {
    fontSize: 16,
    color: 'white',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 4,
  },
  progressText: {
    color: 'white',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
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
