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
      
      if (__DEV__) {
        console.log('[ArticlesScreen] Loading articles for locale:', currentLocale);
      }
      
      let feedData, featuredData;
      try {
        [feedData, featuredData] = await Promise.all([
          ApiService.getArticlesFeed(1, 50, currentLocale).catch((err) => {
            if (__DEV__) console.warn('[ArticlesScreen] getArticlesFeed failed, using empty result:', err);
            return { articles: [], total: 0, page: 1, pageSize: 50 };
          }),
          ApiService.getFeaturedArticles(FEATURED_LIMIT, currentLocale).catch((err) => {
            if (__DEV__) console.warn('[ArticlesScreen] getFeaturedArticles failed, using empty result:', err);
            return [];
          }),
        ]);
      } catch (err) {
        if (__DEV__) console.error('[ArticlesScreen] Error in Promise.all:', err);
        feedData = { articles: [], total: 0, page: 1, pageSize: 50 };
        featuredData = [];
      }
      
      if (__DEV__) {
        console.log('[ArticlesScreen] Raw API response:', { 
          articlesCount: feedData?.articles?.length || 0,
          total: feedData?.total || 0,
          featuredCount: Array.isArray(featuredData) ? featuredData.length : 0,
          feedDataKeys: feedData ? Object.keys(feedData) : [],
          feedSample: feedData?.articles?.[0],
          featuredSample: Array.isArray(featuredData) ? featuredData[0] : null,
        });
      }
      
      // Remove duplicates by slug and filter by locale
      // Be less strict with filtering - allow articles without slug or locale
      const uniqueArticles = Object.values(
        (feedData?.articles || [])
          .filter((article) => {
            // Basic validation - must have at least title or slug
            if (!article || (!article.title && !article.slug && !article.name)) return false;
            // Filter by locale only if both article.locale and currentLocale are set
            // Don't filter if article.locale is not set (allow articles without locale)
            if (article.locale && currentLocale && article.locale !== currentLocale) return false;
            return true;
          })
          .reduce((acc, article) => {
            // Use slug if available, otherwise use title or name, or generate a key
            const articleKey = article.slug || article.title || article.name || `article-${Math.random()}`;
            const key = `${article.locale || currentLocale}:${articleKey}`;
            if (!acc[key]) {
              acc[key] = article;
            }
            return acc;
          }, {})
      );
      
      if (__DEV__) {
        console.log('[ArticlesScreen] After filtering:', {
          uniqueCount: uniqueArticles.length,
          sample: uniqueArticles[0],
        });
      }
      
      setFeed({
        ...feedData,
        articles: uniqueArticles,
        total: uniqueArticles.length,
      });
      
      // Remove duplicates by slug, filter by locale, and ensure featuredData is an array
      if (Array.isArray(featuredData) && featuredData.length > 0) {
        const seen = new Set();
        const unique = featuredData
          .filter((article) => {
            // Allow articles without slug if they have title or name
            if (!article || (!article.slug && !article.title && !article.name)) return false;
            // Filter by locale only if both article.locale and currentLocale are set
            if (article.locale && currentLocale && article.locale !== currentLocale) return false;
            return true;
          })
          .filter((article) => {
            // Use slug if available, otherwise use title or name
            const articleKey = article.slug || article.title || article.name || `article-${Math.random()}`;
            const key = `${article.locale || currentLocale}:${articleKey}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setFeatured(unique.slice(0, FEATURED_LIMIT));
        
        if (__DEV__) {
          console.log('[ArticlesScreen] Featured after filtering:', unique.length);
        }
      } else {
        setFeatured([]);
      }
    } catch (err) {
      if (__DEV__) console.error('[ArticlesScreen] Error loading articles:', err);
      setError(t('articles.errorLoading') || 'Failed to load articles');
      // Set empty arrays on error to show empty state
      setFeed({ articles: [], total: 0, page: 1, pageSize: 50 });
      setFeatured([]);
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
      const currentLocale = language || 'ru';
      const result = await ApiService.getArticlesByTag(tag, 1, 20, currentLocale);
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
    const filtered = articlesList
      .filter((article) => {
        // Basic validation - must have at least slug, title, or name
        if (!article || (!article.slug && !article.title && !article.name)) return false;
        // Filter by locale only if both article.locale and currentLocale are set
        // Don't filter if article.locale is not set (allow articles without locale)
        if (article.locale && currentLocale && article.locale !== currentLocale) return false;
        // Check if title/name is a localization key (contains dots and looks like a key)
        // But be less strict - only filter if it's clearly a key like "articles.title"
        const titleOrName = article.title || article.name || '';
        if (titleOrName && titleOrName.includes('.') && titleOrName.length > 3 && titleOrName.split('.').length >= 2) {
          // Check if it starts with common i18n prefixes
          const isKey = titleOrName.startsWith('articles.') || 
                       titleOrName.startsWith('common.') ||
                       titleOrName.startsWith('profile.');
          if (isKey) {
            return false;
          }
        }
        // Use slug if available, otherwise use title or name, or generate a key
        const articleKey = article.slug || article.title || article.name || `article-${Math.random()}`;
        const key = `${article.locale || currentLocale}:${articleKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    
    if (__DEV__) {
      console.log('[ArticlesScreen] Filtered articles:', {
        inputCount: articlesList.length,
        outputCount: filtered.length,
        currentLocale,
        activeFeedType: searchQuery ? 'search' : selectedTag ? 'tag' : 'feed',
        firstArticle: filtered[0] ? { id: filtered[0].id, title: filtered[0].title, slug: filtered[0].slug } : null,
      });
    }
    
    return filtered;
  }, [activeFeed?.articles, language, searchQuery, selectedTag]);
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

