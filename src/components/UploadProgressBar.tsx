import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UploadProgressBarProps {
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'error';
  onComplete?: () => void;
}

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  progress,
  status,
  onComplete,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (status === 'uploading' || status === 'processing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [progress, status, progressAnim, pulseAnim]);

  useEffect(() => {
    if (status === 'completed' && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onComplete]);

  const getStatusInfo = () => {
    switch (status) {
      case 'uploading':
        return {
          icon: 'cloud-upload',
          text: 'Uploading...',
          color: '#3498DB',
        };
      case 'processing':
        return {
          icon: 'cog',
          text: 'Processing...',
          color: '#F39C12',
        };
      case 'completed':
        return {
          icon: 'checkmark-circle',
          text: 'Completed',
          color: '#2ECC71',
        };
      case 'error':
        return {
          icon: 'alert-circle',
          text: 'Error',
          color: '#E74C3C',
        };
      default:
        return {
          icon: 'help-circle',
          text: 'Unknown',
          color: '#95A5A6',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
        </Animated.View>
        <Text style={styles.statusText}>{statusInfo.text}</Text>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: statusInfo.color,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  progressContainer: {
    height: 8,
  },
  progressTrack: {
    flex: 1,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
