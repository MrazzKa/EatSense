import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

interface SwipeClosableModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  presentationStyle?: 'fullScreen' | 'pageSheet';
}

const SWIPE_CLOSE_THRESHOLD = 80;

export const SwipeClosableModal: React.FC<SwipeClosableModalProps> = ({
  visible,
  onClose,
  children,
  presentationStyle = 'pageSheet', // Default to pageSheet to avoid gray screen on iOS
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return gesture.dy > 5;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > SWIPE_CLOSE_THRESHOLD) {
          Animated.timing(translateY, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={false}
      presentationStyle={presentationStyle === 'fullScreen' ? 'fullScreen' : 'pageSheet'}
    >
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background || colors.surface || '#FFFFFF',
            // Use safe area insets instead of StatusBar.currentHeight (which is undefined on iOS)
            paddingTop: Platform.OS === 'ios' && presentationStyle === 'fullScreen' ? insets.top : 0,
          },
        ]}
      >
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheet: {
    flex: 1,
  },
});

export default SwipeClosableModal;
