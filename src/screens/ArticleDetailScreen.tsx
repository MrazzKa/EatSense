import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import RenderHTML from 'react-native-render-html';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/apiService';
import { useI18n } from '../../app/i18n/hooks';
import { PADDING, SPACING, BORDER_RADIUS } from '../utils/designConstants';

const fallbackMarkdown = (content, colors) => {
  if (!content || typeof content !== 'string') {
    return null;
  }
  return content.split('\n').filter(Boolean).map((line, index) => (
    <Text key={`${line}-${index}`} style={[styles.markdownFallback, { color: colors.textSecondary }]}>
      {line}
    </Text>
  ));
};

export default function ArticleDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { slug } = route.params || {};
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { width } = useWindowDimensions();

  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadArticle = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentLocale = language || 'ru';
      const data = await ApiService.getArticleBySlug(slug, currentLocale);
      setArticle(data);
    } catch (err) {
      console.error('[ArticleDetailScreen] Error loading article:', err);
      setError(t('articles.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  }, [slug, language, t]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  const handleOpenSource = useCallback(async () => {
    if (article?.sourceUrl) {
      try {
        await Linking.openURL(article.sourceUrl);
      } catch (err) {
        console.error('Failed to open source url:', err);
      }
    }
  }, [article]);

  const readingTimeLabel = useCallback(
    (minutes) => {
      if (!minutes) {
        return t('articles.quickRead');
      }
      return t('articles.readingTime', { minutes });
    },
    [t],
  );

  const formattedDate = useMemo(() => {
    if (!article?.publishedAt) {
      return null;
    }
    try {
      return new Date(article.publishedAt).toLocaleDateString(language || 'en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  }, [article?.publishedAt, language]);

  const htmlSource = useMemo(() => {
    if (article?.contentHtml) {
      return { html: article.contentHtml };
    }
    return null;
  }, [article?.contentHtml]);

  const markdownContent = useMemo(() => {
    // Use bodyMarkdown first, fallback to contentMd for backward compatibility
    return article?.bodyMarkdown || article?.contentMd || '';
  }, [article?.bodyMarkdown, article?.contentMd]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.loadingContainer}> 
          <ActivityIndicator size="large" color={colors.primary} /> 
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('articles.loading')}</Text> 
        </View> 
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.loadingContainer}> 
          <Ionicons name="warning" size={36} color={colors.error} /> 
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> 
          <TouchableOpacity style={styles.retryButton} onPress={loadArticle}> 
            <Text style={[styles.retryLabel, { color: colors.primary }]}>{t('articles.retry')}</Text> 
          </TouchableOpacity> 
        </View> 
      </SafeAreaView>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => navigation && typeof navigation.goBack === 'function' ? navigation.goBack() : null}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}> 
          {t('articles.article')} 
        </Text> 
        <View style={styles.headerPlaceholder} /> 
      </View> 

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}> 
        {article.heroImageUrl || article.coverUrl ? (
          <ImageBackground
            source={{ uri: article.heroImageUrl || article.coverUrl }}
            style={styles.hero}
            imageStyle={styles.heroImage}
          >
            <View style={[styles.heroOverlay, { backgroundColor: 'rgba(0,0,0,0.25)' }]}> 
              <Text style={[styles.heroTitle, { color: '#fff' }]}>{article.title}</Text>
              {article.subtitle ? (
                <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>{article.subtitle}</Text>
              ) : null}
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.heroTitle, { color: colors.text }]}>{article.title}</Text>
            {article.subtitle ? (
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{article.subtitle}</Text>
            ) : null}
          </View>
        )}

        <View style={styles.contentContainer}> 
          <View style={styles.metaBlock}> 
            {article.sourceName ? (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{article.sourceName}</Text>
            ) : null}
            {formattedDate ? (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formattedDate}</Text>
            ) : null}
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {readingTimeLabel(article.readingMinutes)}
            </Text>
          </View>

          {article.tags?.length ? (
            <View style={styles.tagsRow}>
              {(article.tags || []).map((tag) => (
                <View key={tag} style={[styles.tagPill, { backgroundColor: colors.inputBackground }]}> 
                  <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text> 
                </View>
              ))}
            </View>
          ) : null}

          {article.sourceUrl ? (
            <TouchableOpacity style={[styles.sourceButton, { borderColor: colors.primary }]} onPress={handleOpenSource}>
              <Text style={[styles.sourceButtonLabel, { color: colors.primary }]}>
                {t('articles.openSource')}
              </Text>
              <Ionicons name="open-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.contentSection}>
            {htmlSource ? (
              <RenderHTML
                contentWidth={width - PADDING.screen * 2}
                source={htmlSource}
                baseStyle={{ color: colors.text, fontSize: 16, lineHeight: 24 }}
                systemFonts={['System']}
                tagsStyles={{
                  p: { color: colors.textSecondary, lineHeight: 24, marginBottom: SPACING.sm },
                  h1: { color: colors.text, fontSize: 26, marginVertical: SPACING.md },
                  h2: { color: colors.text, fontSize: 22, marginTop: SPACING.md },
                  h3: { color: colors.text, fontSize: 18, marginTop: SPACING.sm },
                  li: { color: colors.textSecondary, marginBottom: SPACING.xs },
                }}
              />
            ) : markdownContent ? (
              <Markdown
                style={{
                  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
                  heading1: { color: colors.text, fontSize: 26, fontWeight: '700', marginVertical: SPACING.md },
                  heading2: { color: colors.text, fontSize: 22, fontWeight: '600', marginTop: SPACING.md, marginBottom: SPACING.sm },
                  heading3: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: SPACING.sm, marginBottom: SPACING.xs },
                  paragraph: { color: colors.textSecondary, lineHeight: 24, marginBottom: SPACING.sm },
                  listItem: { color: colors.textSecondary, marginBottom: SPACING.xs },
                  bullet_list: { marginBottom: SPACING.sm },
                  ordered_list: { marginBottom: SPACING.sm },
                  strong: { color: colors.text, fontWeight: '600' },
                  em: { fontStyle: 'italic' },
                  link: { color: colors.primary },
                  text: { color: colors.textSecondary },
                }}
              >
                {markdownContent}
              </Markdown>
            ) : (
              fallbackMarkdown(article?.contentMd || '', colors)
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING.screen,
    paddingVertical: PADDING.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerPlaceholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    height: 220,
    justifyContent: 'flex-end',
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    paddingHorizontal: PADDING.screen,
    paddingVertical: PADDING.lg,
  },
  heroPlaceholder: {
    paddingHorizontal: PADDING.screen,
    paddingVertical: PADDING.xl,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    marginTop: SPACING.xs,
    opacity: 0.9,
  },
  contentContainer: {
    paddingHorizontal: PADDING.screen,
    paddingTop: PADDING.lg,
    paddingBottom: PADDING.xxxl,
  },
  metaBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tagPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.lg,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: PADDING.lg,
  },
  sourceButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  contentSection: {
    gap: SPACING.md,
  },
  markdownFallback: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: PADDING.screen,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: PADDING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});

