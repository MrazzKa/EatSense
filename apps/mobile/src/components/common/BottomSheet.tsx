import React, { ReactNode, useEffect, useRef } from 'react';
import { Modal, KeyboardAvoidingView, Platform, TouchableOpacity, View, StyleSheet, ViewStyle, Animated, PanResponder } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Extra style for the sheet card (e.g. paddingBottom for safe area). */
  cardStyle?: ViewStyle;
}

/**
 * Shared bottom-sheet container: dimmed scrim (tap to dismiss), keyboard
 * avoidance, grabber handle, rounded top card, and swipe-down-to-dismiss.
 * Use for lightweight inputs/menus so every sheet in the app looks and behaves
 * the same.
 */
export function BottomSheet({ visible, onClose, children, cardStyle }: BottomSheetProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(0)).current;

  // Reset the card to its resting position every time the sheet opens.
  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      // Only claim the gesture once it's clearly a downward drag, so taps on
      // buttons inside the sheet still work.
      onMoveShouldSetPanResponder: (_evt, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_evt, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_evt, g) => {
        // Dismiss on a decisive drag or flick down; otherwise spring back.
        if (g.dy > 110 || g.vy > 0.8) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.surface || '#FFF', borderColor: colors.border || '#E5E7EB', transform: [{ translateY }] },
            cardStyle,
          ]}
        >
          {/* Drag the grabber zone to dismiss. Keeping the gesture on the handle
              (not the whole card) means taps/scrolls inside the sheet are never
              hijacked by the swipe. */}
          <View style={styles.grabZone} {...panResponder.panHandlers}>
            <View style={[styles.grabber, { backgroundColor: colors.border || '#E5E7EB' }]} />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  // Generous touch target around the handle so the swipe-down is easy to grab.
  grabZone: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 4, paddingBottom: 12, marginTop: -4 },
  grabber: { width: 42, height: 4, borderRadius: 2 },
});

export default BottomSheet;
