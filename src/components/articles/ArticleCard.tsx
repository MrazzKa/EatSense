import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { ArticleSummary } from '../../types/articles';
import { BORDER_RADIUS, PADDING, SPACING, SHADOW } from '../../utils/designConstants';

interface ArticleCardProps {
  article: ArticleSummary;
  onPress: (slug: string) => void;
  featured?: boolean;
  readingTimeLabel: (minutes: number | null) => string;
  dateLabel: (iso: string | null) => string;
  featuredLabel: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onPress,
  featured = false,
  readingTimeLabel,
  dateLabel,
  featuredLabel,
}) => {
  const { colors } = useTheme();
  const shadowColor = colors.shadow ?? '#000000';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor }]}
      onPress={() => onPress && typeof onPress === 'function' ? onPress(article.slug) : null}
      activeOpacity={0.9}
    >
      {/* G: Build proper image URL strategy - prioritize coverUrl, then heroImageUrl, then imageUrl, then thumbnailUrl */}
      {(() => {
        const imageUrl = article.coverUrl || article.heroImageUrl || article.imageUrl || article.thumbnailUrl || null;
        return imageUrl ? (
          <ImageBackground
            source={{ uri: imageUrl }}
            style={styles.cover}
            imageStyle={styles.coverImage}
          >
            {featured && (
              <View style={[styles.featuredBadge, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.featuredText}>★</Text>
                <Text style={styles.featuredLabel}>{featuredLabel}</Text>
              </View>
            )}
          </ImageBackground>
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: colors.surface || colors.card }]}>
            <Text style={[styles.coverPlaceholderText, { color: colors.textTertiary || colors.textSecondary }]}>
              {article.title || 'EatSense'}
            </Text>
          </View>
        );
      })()}

      <View style={styles.content}>
        <View style={styles.metaRow}>
          {article.sourceName ? (
            <Text style={[styles.source, { color: colors.textTertiary }]} numberOfLines={1}>
              {article.sourceName}
            </Text>
          ) : null}
          <Text style={[styles.metaDot, { color: colors.textTertiary }]}>•</Text>
          <Text style={[styles.date, { color: colors.textTertiary }]}>
            {dateLabel(article.publishedAt)}
          </Text>
          {article.readingMinutes ? (
            <>
              <Text style={[styles.metaDot, { color: colors.textTertiary }]}>•</Text>
              <Text style={[styles.readingTime, { color: colors.textTertiary }]}>
                {readingTimeLabel(article.readingMinutes)}
              </Text>
            </>
          ) : null}
        </View>

        <Text style={[styles.title, { color: colors.textPrimary || colors.text }]} numberOfLines={2}>
          {article.title}
        </Text>

        {(article.excerpt || article.subtitle) ? (
          <Text style={[styles.excerpt, { color: colors.textSecondary }]} numberOfLines={3}>
            {article.excerpt || article.subtitle}
          </Text>
        ) : null}

        {article.tags?.length ? (
          <View style={styles.tagsRow}>
            {article.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tagPill, { backgroundColor: colors.inputBackground }]}
              >
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOW.md,
  },
  cover: {
    height: 180,
    width: '100%',
    justifyContent: 'flex-start',
  },
  coverImage: {
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderBottomRightRadius: BORDER_RADIUS.md,
  },
  featuredText: {
    color: '#fff',
    fontSize: 12,
    marginRight: 4,
  },
  featuredLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: PADDING.lg,
    paddingVertical: PADDING.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: 4,
  },
  source: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
  },
  readingTime: {
    fontSize: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tagPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
