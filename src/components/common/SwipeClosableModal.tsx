import React, { useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
} from 'react-native';

type AnimationType = 'none' | 'slide' | 'fade';
type PresentationType = 'fullScreen' | 'pageSheet' | 'overFullScreen';

interface SwipeClosableModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  swipeDirection?: 'down' | 'up';
  enableSwipe?: boolean;
  enableBackdropClose?: boolean;
  animationType?: AnimationType;
  presentationStyle?: PresentationType;
}

export const SwipeClosableModal: React.FC<SwipeClosableModalProps> = ({
  visible,
  onClose,
  children,
  swipeDirection = 'down',
  enableSwipe = true,
  enableBackdropClose = true,
  animationType = 'slide',
  // presentationStyle из пропсов сейчас не критичен — всегда используем overFullScreen,
  // чтобы модалки занимали весь экран и не обрезались.
  presentationStyle,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        enableSwipe && Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_, gesture) => {
        const delta = gesture.dy;
        if (swipeDirection === 'down' && delta > 0) {
          translateY.setValue(delta);
        } else if (swipeDirection === 'up' && delta < 0) {
          translateY.setValue(delta);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const threshold = 80;
        const delta = gesture.dy;
        const shouldClose =
          (swipeDirection === 'down' && delta > threshold) ||
          (swipeDirection === 'up' && delta < -threshold);

        if (shouldClose) {
          Animated.timing(translateY, {
            toValue: swipeDirection === 'down' ? 500 : -500,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose && onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {enableBackdropClose ? (
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.backdropTouchable} />
          </TouchableWithoutFeedback>
        ) : (
          <View style={styles.backdropTouchable} />
        )}

        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY }] },
          ]}
          {...(enableSwipe ? panResponder.panHandlers : {})}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetContainer: {
    maxHeight: '90%',
    width: '100%',
  },
});
