// @ts-nocheck
import React from 'react';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

function parsePresetAvatar(url: string | null | undefined): { icon: string; bg: string } | null {
  if (!url?.startsWith('preset://')) return null;
  const parts = url.replace('preset://', '').split('|');
  if (parts.length === 2) return { icon: parts[0], bg: parts[1] };
  return null;
}

export function ProfileAvatarButton() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();

  const preset = parsePresetAvatar(user?.avatarUrl);
  const hasPhoto = !!user?.avatarUrl && !preset;
  const firstName = user?.profile?.firstName || user?.firstName;
  const lastName = user?.profile?.lastName || user?.lastName;

  // Build initials: prefer first+last name, fall back to email
  let initials = '?';
  if (firstName && lastName) {
    initials = (firstName[0] + lastName[0]).toUpperCase();
  } else if (firstName) {
    initials = firstName[0].toUpperCase();
  } else if (user?.email) {
    initials = user.email[0].toUpperCase();
  }

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile' as never)}
      style={[styles.outerRing, { borderColor: colors.primary + '40' }]}
      activeOpacity={0.7}
    >
      <View style={[styles.container, { backgroundColor: preset ? preset.bg : hasPhoto ? 'transparent' : colors.primary + '18' }]}>
        {preset ? (
          <Ionicons name={preset.icon} size={18} color="#FFF" />
        ) : hasPhoto ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            {initials !== '?' ? (
              <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
            ) : (
              <Ionicons name="person" size={16} color={colors.primary} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  defaultAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 12,
    fontWeight: '700',
  },
});
