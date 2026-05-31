import React, { ReactNode } from 'react';
import { Modal, KeyboardAvoidingView, Platform, TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
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
 * avoidance, grabber handle, rounded top card. Use for lightweight inputs/menus
 * so every sheet in the app looks and behaves the same.
 */
export function BottomSheet({ visible, onClose, children, cardStyle }: BottomSheetProps) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface || '#FFF', borderColor: colors.border || '#E5E7EB' },
            cardStyle,
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border || '#E5E7EB' }]} />
          {children}
        </View>
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
  grabber: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, marginBottom: 16 },
});

export default BottomSheet;
