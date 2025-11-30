import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100; // Minimum distance to trigger close
const VELOCITY_THRESHOLD = 0.5; // Minimum velocity to trigger close

interface SwipeClosableModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  swipeDirection?: 'down' | 'up' | 'left' | 'right';
  enableSwipe?: boolean;
  enableBackdropClose?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
}

export const SwipeClosableModal: React.FC<SwipeClosableModalProps> = ({
  visible,
  onClose,
  children,
  swipeDirection = 'down',
  enableSwipe = true,
  enableBackdropClose = true,
  animationType = 'fade',
  presentationStyle = 'pageSheet',
}) => {
  const { tokens, colors } = useTheme();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enableSwipe,
      onMoveShouldSetPanResponder: () => enableSwipe,
      onPanResponderGrant: () => {
        // Stop any ongoing animations
        translateY.stopAnimation();
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (swipeDirection === 'down') {
          translateY.setValue(Math.max(0, gestureState.dy));
        } else if (swipeDirection === 'up') {
          translateY.setValue(Math.min(0, gestureState.dy));
        } else if (swipeDirection === 'right') {
          translateX.setValue(Math.max(0, gestureState.dx));
        } else if (swipeDirection === 'left') {
          translateX.setValue(Math.min(0, gestureState.dx));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose =
          (swipeDirection === 'down' && (gestureState.dy > SWIPE_THRESHOLD || gestureState.vy > VELOCITY_THRESHOLD)) ||
          (swipeDirection === 'up' && (gestureState.dy < -SWIPE_THRESHOLD || gestureState.vy < -VELOCITY_THRESHOLD)) ||
          (swipeDirection === 'right' && (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > VELOCITY_THRESHOLD)) ||
          (swipeDirection === 'left' && (gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -VELOCITY_THRESHOLD));

        if (shouldClose && enableSwipe) {
          closeModal();
        } else {
      // Snap back to original position with a very small, simple animation
      Animated.timing(translateY, {
        toValue: swipeDirection === 'down' || swipeDirection === 'up' ? 0 : translateY._value,
        duration: 150,
            useNativeDriver: true,
          }).start();
      Animated.timing(translateX, {
            toValue: 0,
        duration: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      if (animationType === 'slide') {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
      // For fade / default, just animate opacity lightly
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      if (animationType === 'slide') {
        Animated.timing(translateY, {
          toValue: swipeDirection === 'down' ? SCREEN_HEIGHT : swipeDirection === 'up' ? -SCREEN_HEIGHT : 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animationType, swipeDirection]);

  const closeModal = () => {
    if (typeof onClose !== 'function') {
      return;
    }
    if (animationType === 'slide') {
      Animated.timing(translateY, {
        toValue: swipeDirection === 'down' ? SCREEN_HEIGHT : swipeDirection === 'up' ? -SCREEN_HEIGHT : 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onClose());
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onClose());
    }
  };

  if (!visible) {
    return null;
  }

  const getTransform = () => {
    const transforms: any[] = [];
    if (animationType === 'slide') {
      if (swipeDirection === 'down' || swipeDirection === 'up') {
        transforms.push({ translateY });
      } else {
        transforms.push({ translateX });
      }
    }
    return transforms;
  };

  const isFullScreen = presentationStyle === 'fullScreen';

  return (
    <Modal
      visible={visible}
      transparent={!isFullScreen}
      animationType="none"
      presentationStyle={presentationStyle}
      onRequestClose={closeModal}
    >
      <View style={[styles.overlay, isFullScreen && styles.overlayFullScreen]}>
        {!isFullScreen && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: animationType === 'fade' ? opacity : 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            },
          ]}
        >
          {enableBackdropClose && (
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeModal}
            />
          )}
        </Animated.View>
        )}
        <Animated.View
          style={[
            styles.content,
            isFullScreen && styles.contentFullScreen,
            {
              backgroundColor: colors.surface || colors.card || colors.background,
              transform: getTransform(),
              opacity: animationType === 'fade' ? opacity : 1,
            },
          ]}
          {...(enableSwipe && swipeDirection === 'down' && !isFullScreen ? panResponder.panHandlers : {})}
        >
          {enableSwipe && swipeDirection === 'down' && !isFullScreen && (
            <View style={styles.swipeHandle}>
              <View style={[styles.handleBar, { backgroundColor: tokens.colors.borderMuted || '#BDC3C7' }]} />
            </View>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayFullScreen: {
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    // backgroundColor will be set dynamically from theme
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  contentFullScreen: {
    maxHeight: SCREEN_HEIGHT,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    flex: 1,
  },
  swipeHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});

