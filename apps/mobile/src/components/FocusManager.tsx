import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

interface FocusManagerProps {
  children: React.ReactNode;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  autoFocus = false,
  onFocus,
  onBlur,
}) => {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (autoFocus && containerRef.current) {
      containerRef.current.focus();
    }
  }, [autoFocus]);

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    onBlur?.();
  };

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onFocus={handleFocus}
      onBlur={handleBlur}
      accessible={true}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
