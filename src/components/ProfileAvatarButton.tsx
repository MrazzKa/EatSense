// @ts-nocheck
import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export function ProfileAvatarButton() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();

  const initials = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile' as never)}
      style={[styles.container, { backgroundColor: colors.primary + '20' }]}
      activeOpacity={0.7}
    >
      {user?.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
      ) : (
        <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  initials: {
    fontSize: 14,
    fontWeight: '600',
  },
});
