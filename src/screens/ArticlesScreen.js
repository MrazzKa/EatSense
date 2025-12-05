import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';
import { PADDING, SPACING, BORDER_RADIUS } from '../utils/designConstants';
import { ArticleCard } from '../components/articles/ArticleCard';
import { ArticleSkeleton } from '../components/articles/ArticleSkeleton';

const FEATURED_LIMIT = 5;

export default function ArticlesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const [feed, setFeed] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFeed, setSearchFeed] = useState(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [tagFeed, setTagFeed] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isTagLoading, setIsTagLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadArticles = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setIsLoading(true);
      }
      setError(null);
      const currentLocale = language || 'ru';
      const [feedData, featuredData] = await Promise.all([
        ApiService.getArticlesFeed(1, 50, currentLocale),
        ApiService.getFeaturedArticles(FEATURED_LIMIT, currentLocale),
      ]);
      
      // Remove duplicates by slug and filter by locale
      const uniqueArticles = Object.values(
        feedData.articles
          .filter((article) => !article.locale || article.locale === currentLocale)
          .reduce((acc, article) => {
            if (!article?.slug) return acc;
            const key = `${article.locale || currentLocale}:${article.slug}`;
            if (!acc[key]) {
              acc[key] = article;
            }
            return acc;
          }, {})
      );
      
      setFeed({
        ...feedData,
        articles: uniqueArticles,
      });
      
      // Remove duplicates by slug, filter by locale, and ensure featuredData is an array
      if (Array.isArray(featuredData)) {
        const seen = new Set();
        const unique = featuredData
          .filter((article) => !article.locale || article.locale === currentLocale)
          .filter((article) => {
            if (!article?.slug) return false;
            const key = `${article.locale || currentLocale}:${article.slug}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setFeatured(unique.slice(0, FEATURED_LIMIT));
      } else {
        setFeatured([]);
      }
    } catch (err) {
      if (__DEV__) console.error('[ArticlesScreen] Error loading articles:', err);
      setError(t('articles.errorLoading'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t, language]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSearchQuery('');
    setSearchFeed(null);
    setSelectedTag('');
    setTagFeed(null);
    loadArticles(false);
  }, [loadArticles]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchFeed(null);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const currentLocale = language || 'ru';
      const result = await ApiService.searchArticles(query.trim(), 1, 20, currentLocale);
      
      // Remove duplicates by slug
      const uniqueArticles = Object.values(
        result.articles.reduce((acc, article) => {
          if (!article?.slug) return acc;
          const key = `${article.locale || currentLocale}:${article.slug}`;
          if (!acc[key]) {
            acc[key] = article;
          }
          return acc;
        }, {})
      );
      
      setSearchFeed({
        ...result,
        articles: uniqueArticles,
      });
    } catch (err) {
      console.error('Error searching articles:', err);
      setSearchFeed({ articles: [], page: 1, pageSize: 20, total: 0 });
    } finally {
      setIsSearching(false);
    }
  };

  const handleTagPress = async (tag) => {
    if (selectedTag === tag) {
      setSelectedTag('');
      setTagFeed(null);
      return;
    }

    try {
      setSelectedTag(tag);
      setIsTagLoading(true);
      const result = await ApiService.getArticlesByTag(tag);
      setTagFeed(result);
    } catch (err) {
      console.error('Error loading tag articles:', err);
      setTagFeed({ articles: [], page: 1, pageSize: 20, total: 0 });
    } finally {
      setIsTagLoading(false);
    }
  };

  const readingTimeLabel = useCallback(
    (minutes) => {
      if (!minutes) {
        return t('articles.quickRead');
      }
      return t('articles.readingTime', { minutes });
    },
    [t],
  );

  const dateLabel = useCallback(
    (iso) => {
      if (!iso) {
        return t('articles.updatedRecently');
      }
      try {
        return new Date(iso).toLocaleDateString(language || 'en');
      } catch {
        return t('articles.updatedRecently');
      }
    },
    [language, t],
  );

  const tagOptions = useMemo(() => {
    const tags = new Set();
    (feed?.articles || []).forEach((article) => {
      if (article?.tags && Array.isArray(article.tags)) {
        article.tags.forEach((tag) => tags.add(tag));
      }
    });
    (featured || []).forEach((article) => {
      if (article?.tags && Array.isArray(article.tags)) {
        article.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [feed, featured]);

  const activeFeed = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return searchFeed;
    }
    if (selectedTag) {
      return tagFeed;
    }
    return feed;
  }, [feed, searchFeed, tagFeed, searchQuery, selectedTag]);

  // Deduplicate articles by slug, filter by locale, and filter out invalid articles before rendering
  const articles = useMemo(() => {
    const articlesList = activeFeed?.articles || [];
    const currentLocale = language || 'ru';
    const seen = new Set();
    return articlesList
      .filter((article) => !article.locale || article.locale === currentLocale)
      .filter((article) => {
        // Don't render if title is missing or empty
        if (!article?.title || article.title.trim().length === 0) return false;
        // Don't render if both excerpt and subtitle are missing
        if (!article?.excerpt && !article?.subtitle) return false;
        if (!article?.slug) return false;
        if (seen.has(article.slug)) return false;
        seen.add(article.slug);
        return true;
      });
  }, [activeFeed?.articles, language]);
  const showEmptyState = !isLoading && !isSearching && !isTagLoading && articles.length === 0;

  const renderTagChip = ({ item }) => {
    const isActive = selectedTag === item;
    return (
      <TouchableOpacity
        style={[
          styles.tagChip,
          {
            backgroundColor: isActive ? colors.primary : colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => handleTagPress(item)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.tagChipText,
            { color: isActive ? colors.onPrimary : colors.text },
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleArticlePress = (slug) => {
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('ArticleDetail', { slug });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => navigation && typeof navigation.goBack === 'function' ? navigation.goBack() : null}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('articles.title')}</Text> 
        <View style={styles.headerPlaceholder} /> 
      </View> 

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
        <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} /> 
        <TextInput 
          style={[styles.searchInput, { color: colors.text, backgroundColor: colors.inputBackground }]} 
          placeholder={t('articles.searchPlaceholder')} 
          placeholderTextColor={colors.textTertiary} 
          value={searchQuery} 
          onChangeText={handleSearch} 
          autoCapitalize="none" 
          autoCorrect={false} 
        /> 
        {searchQuery.length > 0 && ( 
          <TouchableOpacity onPress={() => handleSearch('')}> 
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} /> 
          </TouchableOpacity> 
        )} 
      </View> 

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {error ? (
          <View style={styles.errorState}>
            <Ionicons name="warning" size={32} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadArticles()}>
              <Text style={[styles.retryLabel, { color: colors.primary }]}>{t('articles.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isLoading && !isRefreshing ? (
          <View style={styles.section}>
            {[0, 1, 2].map((idx) => (
              <ArticleSkeleton key={`skeleton-${idx}`} />
            ))}
          </View>
        ) : (
        <>
        {featured.length > 0 && !searchQuery && !selectedTag && (
          <View style={styles.section}> 
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('articles.featured')}</Text> 
            {(featured || []).map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                featured
                featuredLabel={t('articles.featuredBadge')}
                readingTimeLabel={readingTimeLabel}
                dateLabel={dateLabel}
                onPress={handleArticlePress}
              />
            ))}
          </View>
        )}

        {tagOptions.length > 0 && (
          <View style={styles.tagsSection}>
            <View style={styles.tagsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('articles.browseByTag')}</Text>
              {selectedTag ? (
                <TouchableOpacity onPress={() => handleTagPress(selectedTag)}> 
                  <Text style={[styles.clearTag, { color: colors.primary }]}>{t('articles.clearTag')}</Text> 
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={tagOptions}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              renderItem={renderTagChip}
              ItemSeparatorComponent={() => <View style={{ width: SPACING.sm }} />}
              contentContainerStyle={styles.tagsList}
            />
          </View>
        )}

        {(searchQuery || selectedTag) && (
          <View style={[styles.sectionHeaderRow, { paddingHorizontal: PADDING.screen }]}> 
            <Text style={[styles.sectionMeta, { color: colors.textSecondary }]}> 
              {selectedTag
                ? isTagLoading
                  ? t('articles.loadingTag', { tag: selectedTag })
                  : t('articles.tagResultCount', { tag: selectedTag, count: activeFeed?.total || 0 })
                : isSearching
                ? t('articles.searching')
                : t('articles.searchResultCount', { count: activeFeed?.total || 0 })}
            </Text>
          </View>
        )}

        {isTagLoading || isSearching ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}

        {showEmptyState ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? t('articles.noArticles') : t('articles.comingSoon')}
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            {!searchQuery && !selectedTag && (
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('articles.allArticles')}</Text>
            )}
            {(articles || []).map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                featured={false}
                featuredLabel={t('articles.featuredBadge')}
                readingTimeLabel={readingTimeLabel}
                dateLabel={dateLabel}
                onPress={handleArticlePress}
              />
            ))}
          </View>
        )}
        </>
        )}
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
    fontSize: 20,
    fontWeight: '600',
  },
  headerPlaceholder: {
    width: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING.screen,
    paddingVertical: PADDING.md,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: PADDING.screen,
    paddingTop: PADDING.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: PADDING.md,
  },
  tagsSection: {
    paddingTop: PADDING.lg,
    paddingBottom: SPACING.md,
  },
  tagsHeader: {
    paddingHorizontal: PADDING.screen,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsList: {
    paddingHorizontal: PADDING.screen,
    paddingVertical: SPACING.sm,
  },
  tagChip: {
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearTag: {
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    paddingVertical: PADDING.lg,
    alignItems: 'center',
  },
  errorState: {
    paddingHorizontal: PADDING.screen,
    paddingVertical: PADDING.xl,
    alignItems: 'center',
    gap: SPACING.md,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: PADDING.xxxl,
  },
  emptyText: {
    fontSize: 16,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    marginTop: PADDING.lg,
    marginBottom: SPACING.sm,
  },
  sectionMeta: {
    fontSize: 14,
    fontWeight: '500',
  },
});

