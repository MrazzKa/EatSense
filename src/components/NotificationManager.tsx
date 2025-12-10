import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface NotificationManagerProps {
  notifications: Notification[];
  onRemove: (_id: string) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onRemove,
}) => {
  const [animatedValues] = useState<Map<string, Animated.Value>>(new Map());

  const removeNotification = useCallback((id: string) => {
    const animatedValue = animatedValues.get(id);
    if (animatedValue) {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onRemove(id);
        animatedValues.delete(id);
      });
    }
  }, [animatedValues, onRemove]);

  useEffect(() => {
    notifications.forEach(notification => {
      if (!animatedValues.has(notification.id)) {
        animatedValues.set(notification.id, new Animated.Value(0));
      }
    });
  }, [notifications, animatedValues]);

  useEffect(() => {
    notifications.forEach(notification => {
      const animatedValue = animatedValues.get(notification.id);
      if (animatedValue) {
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        if (notification.duration) {
          setTimeout(() => {
            removeNotification(notification.id);
          }, notification.duration);
        }
      }
    });
  }, [notifications, animatedValues, removeNotification]);

  const getNotificationStyle = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#2ECC71', icon: 'checkmark-circle' };
      case 'error':
        return { backgroundColor: '#E74C3C', icon: 'alert-circle' };
      case 'warning':
        return { backgroundColor: '#F39C12', icon: 'warning' };
      case 'info':
        return { backgroundColor: '#3498DB', icon: 'information-circle' };
      default:
        return { backgroundColor: '#95A5A6', icon: 'help-circle' };
    }
  };

  return (
    <View style={styles.container}>
      {(notifications || []).map(notification => {
        const animatedValue = animatedValues.get(notification.id);
        const style = getNotificationStyle(notification.type);
        
        if (!animatedValue) return null;

        return (
          <Animated.View
            key={notification.id}
            style={[
              styles.notification,
              { backgroundColor: style.backgroundColor },
              {
                opacity: animatedValue,
                transform: [
                  {
                    translateY: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.content}>
              <Ionicons name={style.icon as any} size={20} color="white" />
              <View style={styles.textContainer}>
                <Text style={styles.title}>{notification.title}</Text>
                <Text style={styles.message}>{notification.message}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => removeNotification(notification.id)}
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
