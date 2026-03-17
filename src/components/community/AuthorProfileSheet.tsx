// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../../app/i18n/hooks';
import ApiService from '../../services/apiService';

interface AuthorProfileSheetProps {
  visible: boolean;
  authorId: string | null;
  onClose: () => void;
}

export function AuthorProfileSheet({ visible, authorId, onClose }: AuthorProfileSheetProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && authorId) {
      setLoading(true);
      setProfile(null);
      ApiService.getCommunityUserProfile(authorId)
        .then((data) => setProfile(data))
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
    }
  }, [visible, authorId]);

  const name = visible && profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User'
    : '';
  const initials = name ? name[0].toUpperCase() : '?';

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ paddingVertical: 40 }} />
          ) : profile ? (
            <View style={styles.content}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
              </View>
              <Text style={[styles.name, { color: colors.textPrimary || colors.text }]}>{name}</Text>

              {profile.cityGroup && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>{profile.cityGroup}</Text>
                </View>
              )}

              <View style={styles.statsRow}>
                <View style={[styles.statBox, { backgroundColor: colors.primary + '10' }]}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{profile.postCount || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('community.profile.posts', 'Posts')}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.primary + '10' }]}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {profile.memberSince
                      ? new Date(profile.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                      : '-'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('community.profile.joined', 'Joined')}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={[styles.errorText, { color: colors.textTertiary }]}>
              {t('community.profile.notFound', 'Profile not found')}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    minHeight: 200,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 30,
  },
});
