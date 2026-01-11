import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import ApiService from '../services/apiService';
import { EditFoodItemModal } from '../components/EditFoodItemModal';
import { SwipeableIngredientItem } from '../components/SwipeableIngredientItem';
import { HealthScoreCard } from '../components/HealthScoreCard';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { mapLanguageToLocale } from '../utils/locale';

import FullScreenImageModal from '../components/common/FullScreenImageModal';
import { clientLog } from '../utils/clientLog';
// import { formatMacro } from '../utils/nutritionFormat';
import AiAssistant from '../components/AiAssistant';
// GestureHandlerRootView is now in App.js root



export default function AnalysisResultsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params || {};
  const capturedImageUri = routeParams.imageUri ?? null;
  const localPreviewUri = routeParams.localPreviewUri ?? null; // From pending analysis
  const initialAnalysisParam = routeParams.analysisResult ?? null;
  const readOnly = Boolean(routeParams.readOnly);
  // const pendingStatus = routeParams.status ?? null; // 'processing', 'failed', 'needs_review', 'completed' - Unused
  // Task 5: Use imageUrl from result if available, fallback to imageUri or localPreviewUri
  // Resolve relative URLs to absolute URLs
  // Memoize to prevent recreating normalizeAnalysis on every render
  const baseImageUri = useMemo(() => {
    const raw = capturedImageUri || localPreviewUri || initialAnalysisParam?.imageUrl || initialAnalysisParam?.imageUri || null;
    if (!raw) return null;
    if (raw.startsWith('/media/') || raw.startsWith('/')) {
      return ApiService.resolveMediaUrl(raw);
    }
    return raw;
  }, [capturedImageUri, localPreviewUri, initialAnalysisParam?.imageUrl, initialAnalysisParam?.imageUri]);
  const { colors, tokens } = useTheme();
  const { t, language } = useI18n();

  const [isAnalyzing, setIsAnalyzing] = useState(false); // Убрали отдельное окно процесса анализа
  const [analysisResult, setAnalysisResult] = useState(null);
  const [, setAnalysisId] = useState(routeParams.analysisId || null); // AnalysisId used in state updates
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [analysisPhraseIndex, setAnalysisPhraseIndex] = useState(0);

  const styles = useMemo(() => createStyles(tokens), [tokens]);

  // Rotating analysis phrases for better UX during loading
  const analysisPhrases = useMemo(() => [
    t('analysis.phrases.analyzing') || 'Analyzing photo...',
    t('analysis.phrases.recognizing') || 'Recognizing ingredients...',
    t('analysis.phrases.counting') || 'Counting calories...',
    t('analysis.phrases.portions') || 'Estimating portions...',
    t('analysis.phrases.nutrients') || 'Checking nutrients...',
    t('analysis.phrases.almostDone') || 'Almost done...',
    t('analysis.phrases.formatting') || 'Formatting results...',
  ], [t]);

  // Rotate phrases during analysis
  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setAnalysisPhraseIndex(prev => {
          // After last phrase, stay on "Almost done..."
          if (prev >= analysisPhrases.length - 2) {
            return analysisPhrases.length - 2;
          }
          return prev + 1;
        });
      }, 3000); // Rotate every 3 seconds
      return () => clearInterval(interval);
    } else {
      // Reset index when not analyzing
      setAnalysisPhraseIndex(0);
    }
  }, [isAnalyzing, analysisPhrases.length]);

  const allowEditing = !readOnly;

  // DEBUG: Log allowEditing state to help diagnose production issues
  useEffect(() => {
    clientLog('Analysis:allowEditing', { allowEditing, readOnly, hasResult: !!analysisResult }).catch(() => { });
  }, [allowEditing, readOnly, analysisResult]);

  const navigateToDashboard = useCallback(() => {
    if (navigation && typeof navigation.reset === 'function') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Dashboard' } }],
      });
      return;
    }
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
      return;
    }
    if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  }, [navigation]);

  const showAnalysisError = useCallback(
    (titleKey = 'analysis.errorTitle', messageKey = 'analysis.errorMessage') => {
      setIsAnalyzing(false);
      Alert.alert(
        t(titleKey) || t('analysis.errorTitle'),
        t(messageKey) || t('analysis.errorMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigateToDashboard(),
          },
        ],
        { cancelable: false },
      );
    },
    [navigateToDashboard, t],
  );

  const normalizeAnalysis = useCallback(
    (raw, fallbackImage = undefined) => {
      // Use baseImageUri as fallback only if not explicitly set to null and not text-only analysis
      // const effectiveFallback = fallbackImage !== undefined ? fallbackImage : (routeParams.source !== 'text' ? baseImageUri : null); // Unused

      // Log API response only when explicitly debugging
      // console.log('[AnalysisResults] Raw API response:', JSON.stringify(raw, null, 2));

      if (!raw) {
        return null;
      }

      // =====================================================
      // OBSERVABILITY: CLIENT_LOG for pipeline debugging
      // =====================================================
      if (__DEV__) {
        console.log('[CLIENT_LOG] normalizeAnalysis input:', {
          stage: 'frontend_normalize',
          topLevelKeys: Object.keys(raw),
          dataKeys: raw.data ? Object.keys(raw.data) : [],
          analysisId: raw.id || raw.analysisId,
          mealId: raw.mealId,
          dishNameFields: {
            'data.dishNameLocalized': raw.data?.dishNameLocalized || null,
            'data.originalDishName': raw.data?.originalDishName || null,
            'data.dishNameSource': raw.data?.dishNameSource || null,
            'data.dishNameConfidence': raw.data?.dishNameConfidence || null,
            'data.dishName': raw.data?.dishName || null,
            'raw.dishName': raw.dishName || null,
            'raw.name': raw.name || null,
          },
          itemCount: (raw.data?.items || raw.items)?.length || 0,
          totals: raw.data?.total || null,
        });
      }

      const toNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const toMacro = (value) => Math.round(toNumber(value) * 10) / 10;

      // Поддерживаем как старый формат (ingredients/items на верхнем уровне), так и новый (data.ingredients или data.items)
      const ingredientsSource = raw.data?.ingredients || raw.data?.items || raw.ingredients || raw.items || [];
      const normalizedIngredients = (Array.isArray(ingredientsSource) ? ingredientsSource : []).map((item, index) => {
        // Поддерживаем как старый формат (calories, protein, carbs, fat), так и новый (nutrients)
        const nutrients = item.nutrients || {};
        const caloriesFromApi = Math.max(0, Math.round(toNumber(item.calories ?? item.kcal ?? nutrients.calories ?? 0)));
        const protein = toNumber(item.protein ?? nutrients.protein ?? 0);
        const carbs = toNumber(item.carbs ?? nutrients.carbs ?? 0);
        const fat = toNumber(item.fat ?? nutrients.fat ?? 0);
        const hasMacros = Number.isFinite(protein) || Number.isFinite(carbs) || Number.isFinite(fat);
        let calories = caloriesFromApi;

        if (calories === 0 && hasMacros) {
          const recalculated = protein * 4 + carbs * 4 + fat * 9;
          calories = Math.max(1, Math.round(recalculated)); // at least 1 kcal
        }

        return {
          id: item.id || `item-${index}`,
          name: item.name || item.label || 'Ingredient',
          calories,
          protein: toMacro(protein),
          carbs: toMacro(carbs),
          fat: toMacro(fat),
          weight: Math.round(toNumber(item.weight ?? item.gramsMean ?? item.portion_g ?? 0)),
          // Сохраняем оригинальные поля для совместимости
          portion_g: item.portion_g || item.weight || 0,
          nutrients: item.nutrients || {
            calories,
            protein: toMacro(protein),
            carbs: toMacro(carbs),
            fat: toMacro(fat),
          },
        };
      });

      const sumFromIngredients = (key) =>
        normalizedIngredients.reduce((acc, ing) => acc + toNumber(ing[key]), 0);

      // Поддерживаем как старый формат (totalCalories, totalProtein и т.д.), так и новый (data.total или data.totals)
      const totals = raw.data?.total || raw.data?.totals || {};
      const providedCalories = toNumber(raw.totalCalories ?? raw.calories ?? totals.calories ?? 0);
      const totalCalories = Math.max(0,
        providedCalories ? Math.round(providedCalories) : Math.round(sumFromIngredients('calories')),
      );

      const providedProtein = toNumber(raw.totalProtein ?? raw.protein ?? totals.protein ?? 0);
      const totalProtein = providedProtein
        ? toMacro(providedProtein)
        : toMacro(sumFromIngredients('protein'));

      const providedCarbs = toNumber(raw.totalCarbs ?? raw.carbs ?? totals.carbs ?? 0);
      const totalCarbs = providedCarbs
        ? toMacro(providedCarbs)
        : toMacro(sumFromIngredients('carbs'));

      const providedFat = toNumber(raw.totalFat ?? raw.fat ?? totals.fat ?? 0);
      const totalFat = providedFat
        ? toMacro(providedFat)
        : toMacro(sumFromIngredients('fat'));

      // Поддерживаем как старый формат (healthScore, healthInsights), так и новый (data.healthScore)
      const healthScore = raw.data?.healthScore || raw.healthScore || raw.healthInsights || null;

      // Debug logs removed to reduce console spam
      // See normalizeAnalysis function for data extraction details

      const autoSave = raw.autoSave || raw.savedMeal || null;
      const needsReview = raw.analysisFlags?.needsReview || raw.needsReview || false;
      const isSuspicious = raw.analysisFlags?.isSuspicious || raw.isSuspicious || false;

      return {
        id: raw.id || raw.analysisId || null,
        analysisId: raw.analysisId || raw.id || routeParams.analysisId || null,
        dishName: (() => {
          // STEP 2 FIX: Use displayName as the single source of truth
          // Priority: displayName > dishNameLocalized > originalDishName > dishName > name
          if (__DEV__) {
            console.log('[normalizeAnalysis] dishName candidates:', {
              'raw.data?.displayName': raw.data?.displayName,
              'raw.data?.dishNameLocalized': raw.data?.dishNameLocalized,
              'raw.data?.originalDishName': raw.data?.originalDishName,
              'raw.data?.dishName': raw.data?.dishName,
              'raw.dishName': raw.dishName,
              'raw.name': raw.name,
            });
          }

          // STEP 2: displayName is the preferred field (set by backend)
          let name = raw.data?.displayName || raw.data?.dishNameLocalized || 
            raw.data?.originalDishName || raw.data?.dishName || 
            raw.dishName || raw.name || null;

          // Remove "and more" suffix if present (legacy backend behavior)
          if (name && (name.includes(' and more') || name.includes(' и другое') || name.includes(' және басқалары'))) {
            name = name.replace(/\s+(and more|и другое|және басқалары)$/i, '');
          }

          // If no specific dish name, use localized fallback
          const fallbackMealName = t('dashboard.mealFallback') || 'Meal';
          if (!name || name === 'Food Analysis' || name === 'Meal' || name === 'Блюдо' || name === 'Тағам') {
            // FIX: Only use first ingredient as name if there's EXACTLY 1 ingredient
            // For multi-ingredient meals, use the generic meal name (not first ingredient)
            if (normalizedIngredients.length === 1 && normalizedIngredients[0]?.name) {
              // Single ingredient - use its name
              name = normalizedIngredients[0].name;
            } else {
              // Multiple ingredients OR no ingredients - use generic meal name
              // DON'T use first ingredient to avoid "Овощной суп" → "морковь"
              name = fallbackMealName;
            }
          }

          return name;
        })(),
        // For text-only analysis (source === 'text'), don't use fallback image
        // Only use fallback if we have an actual image from the analysis
        // Resolve relative URLs to absolute URLs
        imageUrl: (() => {
          const url = raw.imageUrl || raw.imageUri || raw.data?.imageUrl || (fallbackImage && routeParams.source !== 'text' ? fallbackImage : null);
          if (!url) return null;
          // If relative path, resolve it using ApiService
          if (url.startsWith('/media/') || url.startsWith('/')) {
            return ApiService.resolveMediaUrl(url);
          }
          return url;
        })(),
        imageUri: (() => {
          const url = raw.imageUrl || raw.imageUri || raw.data?.imageUrl || (fallbackImage && routeParams.source !== 'text' ? fallbackImage : null);
          if (!url) return null;
          // If relative path, resolve it using ApiService
          if (url.startsWith('/media/') || url.startsWith('/')) {
            return ApiService.resolveMediaUrl(url);
          }
          return url;
        })(),

        // Log image extraction for debugging
        ...(__DEV__ ? {
          _debugImageUrl: {
            imageUrl: raw.imageUrl || null,
            imageUri: raw.imageUri || null,
            dataImageUrl: raw.data?.imageUrl || null,
            fallbackImage: fallbackImage || null,
            finalImageUrl: raw.imageUrl || raw.imageUri || raw.data?.imageUrl || (fallbackImage && routeParams.source !== 'text' ? fallbackImage : null),
          },
        } : {}),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        ingredients: normalizedIngredients,
        // Сохраняем data для совместимости
        data: raw.data || {
          items: normalizedIngredients,
          total: totals,
          totals,
          healthScore,
        },
        healthScore,
        autoSave,
        needsReview,
        isSuspicious,
        consumedAt: raw.consumedAt || raw.date || raw.createdAt || null,
      };
    },
    [routeParams.analysisId, routeParams.source, t],
  );

  const applyResult = useCallback(
    (payload, imageOverride, analysisIdOverride) => {
      console.log('[AnalysisResultsScreen] applyResult called');
      const normalized = normalizeAnalysis(payload, imageOverride);
      if (!normalized) {
        setIsAnalyzing(false);
        return;
      }

      const idToSave = analysisIdOverride || normalized.analysisId || normalized.id;
      if (idToSave) {
        setAnalysisId(prevId => {
          if (prevId === idToSave) return prevId;
          console.log('[AnalysisResultsScreen] Setting analysisId:', idToSave);
          return idToSave;
        });
      }

      fadeAnim.setValue(0);

      setAnalysisResult(prevResult => {
        // Simple guard: if IDs match and basic structure is same, skip update?
        // For now, just log.
        if (prevResult?.analysisId === normalized.analysisId && prevResult?.ingredients?.length === normalized.ingredients?.length) {
          console.log('[AnalysisResultsScreen] Skipping duplicate result update (ID match)');
          // Note: This might prevent legitimate updates if content changed but ID didn't. 
          // Better to rely on deep check or just ID for now to stop the crash.
          // If we need to force update, we should clear state first.
          return prevResult;
        }
        console.log('[AnalysisResultsScreen] Setting new analysisResult:', normalized.analysisId);
        return normalized;
      });

      setIsAnalyzing(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    },
    [fadeAnim, normalizeAnalysis],
  );

  // Refs to track processed items and prevent loops/duplicate calls
  const processedRef = useRef({
    initialParam: false,
    lastAnalysisId: null,
    lastImageUri: null,
    lastDescription: null,
  });

  // Effect 1: Handle Initial Analysis Param (passed directly)
  useEffect(() => {
    if (initialAnalysisParam && !processedRef.current.initialParam) {
      processedRef.current.initialParam = true;
      // Slight delay to ensure layout is ready
      setTimeout(() => {
        applyResult(initialAnalysisParam, baseImageUri);
      }, 0);
    }
  }, [initialAnalysisParam, baseImageUri, applyResult]);

  // Effect 2: Handle Route Analysis ID (Polling for existing/shared analysis)
  useEffect(() => {
    const analysisIdFromRoute = routeParams.analysisId;

    // Only run if ID exists and we haven't just processed it (or it changed)
    // We use a specific check to avoid constant re-polling if the ID in route is stable
    if (analysisIdFromRoute && processedRef.current.lastAnalysisId !== analysisIdFromRoute) {
      processedRef.current.lastAnalysisId = analysisIdFromRoute;
      setIsAnalyzing(true);

      // Sync local state
      setAnalysisId(analysisIdFromRoute);

      let cancelled = false;

      const pollForResults = async () => {
        if (cancelled) return;

        try {
          let attempts = 0;
          const maxAttempts = 60; // 3 minutes timeout (60 * 3s)

          const poll = async () => {
            if (cancelled) return;

            try {
              const status = await ApiService.getAnalysisStatus(analysisIdFromRoute);
              console.log(`[AnalysisResultsScreen] Polling analysis ${analysisIdFromRoute}, status:`, status.status);

              const currentStatus = status.status?.toUpperCase();

              if (currentStatus === 'COMPLETED' || currentStatus === 'NEEDS_REVIEW') {
                const result = await ApiService.getAnalysisResult(analysisIdFromRoute);
                console.log(`[AnalysisResultsScreen] Analysis ${analysisIdFromRoute} completed`);
                if (!cancelled) {
                  applyResult(result, null); // Image handled by result.imageUrl
                }
              } else if (currentStatus === 'FAILED') {
                console.error(`[AnalysisResultsScreen] Analysis ${analysisIdFromRoute} failed`);
                if (!cancelled) {
                  showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
                }
              } else if (currentStatus === 'PROCESSING' || currentStatus === 'PENDING') {
                if (attempts < maxAttempts) {
                  attempts += 1;
                  // STEP 7: Progressive polling interval (2.5s base, up to 4s after many attempts)
                  const pollInterval = Math.min(2500 + attempts * 50, 4000);
                  setTimeout(poll, pollInterval);
                } else {
                  console.error(`[AnalysisResultsScreen] Timeout after ${maxAttempts} attempts`);
                  if (!cancelled) {
                    showAnalysisError('analysis.timeoutTitle', 'analysis.timeoutMessage');
                  }
                }
              } else {
                // Unknown status, keep polling briefly
                if (attempts < maxAttempts) {
                  attempts += 1;
                  setTimeout(poll, 3000);
                } else {
                  if (!cancelled) showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
                }
              }
            } catch (error) {
              console.error(`[AnalysisResultsScreen] Polling error:`, error);
              if (attempts < maxAttempts) {
                attempts += 1;
                // STEP 7: Exponential backoff on errors (3s, 4s, 5s, up to 8s)
                const errorBackoff = Math.min(3000 + attempts * 500, 8000);
                setTimeout(poll, errorBackoff);
              } else {
                if (!cancelled) showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
              }
            }
          };

          poll();
        } catch (error) {
          console.error(`[AnalysisResultsScreen] Start polling error:`, error);
          if (!cancelled) showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
        }
      };

      pollForResults();

      return () => {
        cancelled = true;
      };
    }
  }, [routeParams.analysisId, applyResult, showAnalysisError]);

  // Effect 3: Handle New Analysis (Image Capture -> Upload -> Analyze -> Poll)
  // Removed unused effect that depended on capturedImageUri

  // Effect 4: Handle Text Analysis (Legacy/Description)
  useEffect(() => {
    const description = routeParams.description;
    if (description && !routeParams.analysisId && processedRef.current.lastDescription !== description) {
      processedRef.current.lastDescription = description;
      setIsAnalyzing(true);

      const runText = async () => {
        try {
          const locale = mapLanguageToLocale(language);
          const response = await ApiService.analyzeText(description, locale);

          if (response?.analysisId) {
            // Navigate to same screen with analysisId to trigger Effect 2
            if (navigation && typeof navigation.replace === 'function') {
              navigation.replace('AnalysisResults', { analysisId: response.analysisId });
            }
          } else {
            showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
          }
        } catch (_e) {
          console.error('Text Analysis Failed:', _e);
          showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
        }
      };
      runText();
    }
  }, [routeParams.description, routeParams.analysisId, language, navigation, showAnalysisError]);

  // const autoSaveInfo = analysisResult?.autoSave || null; // Unused
  // const hasAutoSave = Boolean(autoSaveInfo?.mealId); // Unused
  // Task 5: Use imageUrl from result if available
  // For text-only analysis, don't use baseImageUri as fallback
  // Resolve relative URLs to absolute URLs
  const previewImage = (() => {
    const raw = analysisResult?.imageUrl || analysisResult?.imageUri || (routeParams.source !== 'text' ? baseImageUri : null);
    if (!raw) return null;
    // If relative path, resolve it using ApiService
    if (raw.startsWith('/media/') || raw.startsWith('/')) {
      return ApiService.resolveMediaUrl(raw);
    }
    return raw;
  })();

  // Removed unused dishTitle variable

  // Removed unused handleShare and handleReanalyze - they are replaced by handleAsk and handleFix

  const handleCorrect = (item, index) => {
    if (!allowEditing) return;
    setEditingItem(item);
    setEditingIndex(index);
  };

  const handleAddItem = () => {
    if (!allowEditing) return;
    setEditingItem({}); // Empty object for new item
    setEditingIndex(-1); // Indicator for new item
    setIsAddingItem(true);
  };

  const handleDeleteItem = async (itemIdOrIndex) => {
    const analysisId = routeParams.analysisId || analysisResult?.analysisId || analysisResult?.id;

    if (!analysisId) {
      Alert.alert(t('common.error'), t('analysis.noAnalysisId') || 'Analysis ID not found');
      return;
    }

    try {
      setIsReanalyzing(true);

      // 1. Получаем текущие items
      const currentItems = analysisResult?.data?.items || analysisResult?.ingredients || [];
      const itemToDelete = currentItems.find((item, idx) =>
        (item.id || String(idx)) === String(itemIdOrIndex) || idx === itemIdOrIndex
      );

      if (!itemToDelete) {
        console.warn('[AnalysisResultsScreen] Item to delete not found:', itemIdOrIndex);
        return;
      }

      // 2. Сохраняем исправление для Feedback Loop
      await ApiService.saveAnalysisCorrection({
        analysisId,
        itemId: itemToDelete.id || String(itemIdOrIndex),
        originalName: itemToDelete.name,
        correctionType: 'item_delete',
        foodCategory: detectFoodCategory(itemToDelete.name),
      }).catch(() => { }); // Non-critical

      // 3. Удаляем элемент из списка
      const updatedItems = currentItems
        .filter((item, idx) => {
          const itemId = item.id || String(idx);
          return itemId !== String(itemIdOrIndex) && idx !== itemIdOrIndex;
        })
        .map((item, idx) => ({
          id: item.id || String(idx),
          name: item.name,
          portion_g: item.portion_g || item.weight || 0,
          calories: item.calories || item.nutrients?.calories || 0,
          protein_g: item.protein || item.nutrients?.protein || 0,
          fat_g: item.fat || item.nutrients?.fat || 0,
          carbs_g: item.carbs || item.nutrients?.carbs || 0,
        }));

      // 4. Вызываем manualReanalyze на бэке
      const newResult = await ApiService.manualReanalyzeAnalysis(analysisId, updatedItems);
      console.log('[AnalysisResultsScreen] Manual reanalyze after delete response:', newResult);

      // 5. Обновляем стейт локально
      if (newResult) {
        const normalized = normalizeAnalysis(newResult, baseImageUri);
        if (normalized.analysisId || normalized.id) {
          setAnalysisId(normalized.analysisId || normalized.id);
        }
        if (normalized) {
          setAnalysisResult(normalized);
        }
      }
    } catch (error) {
      console.error('[AnalysisResultsScreen] Failed to delete item and reanalyze', error);
      Alert.alert(
        t('common.error'),
        t('analysis.deleteError') || 'Failed to delete item. Please try again.',
      );
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleSaveEdit = async (updatedItem, index) => {
    const analysisId = routeParams.analysisId || analysisResult?.analysisId || analysisResult?.id;

    if (!analysisId) {
      Alert.alert(t('common.error'), t('analysis.noAnalysisId') || 'Analysis ID not found');
      return;
    }

    try {
      setIsReanalyzing(true);

      // 1. Получаем текущие items из analysisResult
      const currentItems = analysisResult?.data?.items || analysisResult?.ingredients || [];
      const originalItem = currentItems[index] || currentItems.find((item, idx) => (item.id || String(idx)) === (updatedItem.id || String(index)));

      // 2. Сохраняем исправление для Feedback Loop
      if (originalItem) {
        await ApiService.saveAnalysisCorrection({
          analysisId,
          itemId: originalItem.id || String(index),
          originalName: originalItem.name,
          correctedName: updatedItem.name,
          originalPortionG: originalItem.portion_g || originalItem.weight,
          correctedPortionG: updatedItem.portion_g || updatedItem.weight,
          originalCalories: originalItem.calories || originalItem.nutrients?.calories,
          correctedCalories: updatedItem.calories,
          originalProtein: originalItem.protein || originalItem.nutrients?.protein,
          correctedProtein: updatedItem.protein_g,
          originalCarbs: originalItem.carbs || originalItem.nutrients?.carbs,
          correctedCarbs: updatedItem.carbs_g,
          originalFat: originalItem.fat || originalItem.nutrients?.fat,
          correctedFat: updatedItem.fat_g,
          correctionType: 'nutrients', // or 'name', 'portion', 'replace'
          foodCategory: detectFoodCategory(updatedItem.name),
        }).catch(() => { }); // Non-critical
      }

      // 3. Формируем новый список items для отправки на сервер
      let updatedItems;

      if (index === -1 || isAddingItem) {
        // Adding new item
        updatedItems = [
          ...currentItems,
          {
            id: updatedItem.id || `new-${Date.now()}`,
            name: updatedItem.name,
            portion_g: updatedItem.portion_g || updatedItem.weight || 0,
            calories: updatedItem.calories !== undefined ? updatedItem.calories : 0,
            protein_g: updatedItem.protein_g !== undefined ? updatedItem.protein_g : 0,
            fat_g: updatedItem.fat_g !== undefined ? updatedItem.fat_g : 0,
            carbs_g: updatedItem.carbs_g !== undefined ? updatedItem.carbs_g : 0,
          }
        ];

        // Log correction for new item (item_add)
        await ApiService.saveAnalysisCorrection({
          analysisId,
          itemId: `new-${Date.now()}`,
          originalName: '',
          correctedName: updatedItem.name,
          correctionType: 'item_add',
          foodCategory: detectFoodCategory(updatedItem.name),
        }).catch(() => { });

      } else {
        // Edit existing
        updatedItems = currentItems.map((item, idx) => {
          // Проверяем, это ли тот item, который редактировали
          const itemId = item.id || String(idx);
          const updatedItemId = updatedItem.id || String(index);

          if (itemId === updatedItemId || idx === index) {
            // Обновляем этот item
            return {
              id: item.id || String(idx),
              name: updatedItem.name || item.name,
              portion_g: updatedItem.portion_g || updatedItem.weight || item.portion_g || item.weight || 0,
              calories: updatedItem.calories !== undefined ? updatedItem.calories : (item.calories || item.nutrients?.calories),
              protein_g: updatedItem.protein_g !== undefined ? updatedItem.protein_g : (item.protein || item.nutrients?.protein),
              fat_g: updatedItem.fat_g !== undefined ? updatedItem.fat_g : (item.fat || item.nutrients?.fat),
              carbs_g: updatedItem.carbs_g !== undefined ? updatedItem.carbs_g : (item.carbs || item.nutrients?.carbs),
            };
          }

          // Оставляем остальные items без изменений
          return {
            id: item.id || String(idx),
            name: item.name,
            portion_g: item.portion_g || item.weight || 0,
            calories: item.calories || item.nutrients?.calories || 0,
            protein_g: item.protein || item.nutrients?.protein || 0,
            fat_g: item.fat || item.nutrients?.fat || 0,
            carbs_g: item.carbs || item.nutrients?.carbs || 0,
          };
        });
      }

      // 4. Вызываем manualReanalyze на бэке
      const newResult = await ApiService.manualReanalyzeAnalysis(analysisId, updatedItems);
      console.log('[AnalysisResultsScreen] Manual reanalyze response:', newResult);

      // 5. Обновляем стейт локально
      if (newResult) {
        const normalized = normalizeAnalysis(newResult, baseImageUri);
        // Убеждаемся что analysisId сохраняется
        if (normalized.analysisId || normalized.id) {
          setAnalysisId(normalized.analysisId || normalized.id);
        }
        if (normalized) {
          setAnalysisResult(normalized);
          // Не показываем alert, так как изменения уже применены
        }
      }
    } catch (error) {
      console.error('[AnalysisResultsScreen] Failed to manual reanalyze', error);
      Alert.alert(
        t('common.error'),
        t('analysis.reanalyzeError') || 'Failed to update analysis after manual changes. Please try again.',
      );
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Helper to detect food category for feedback
  const detectFoodCategory = (name) => {
    const nameLower = (name || '').toLowerCase();
    if (nameLower.includes('chicken') || nameLower.includes('beef') || nameLower.includes('pork') || nameLower.includes('meat') || nameLower.includes('курица') || nameLower.includes('говядина') || nameLower.includes('мясо')) return 'meat';
    if (nameLower.includes('fish') || nameLower.includes('salmon') || nameLower.includes('рыба') || nameLower.includes('лосось')) return 'fish';
    if (nameLower.includes('vegetable') || nameLower.includes('salad') || nameLower.includes('овощ') || nameLower.includes('салат')) return 'vegetable';
    if (nameLower.includes('fruit') || nameLower.includes('apple') || nameLower.includes('фрукт') || nameLower.includes('яблоко')) return 'fruit';
    if (nameLower.includes('rice') || nameLower.includes('pasta') || nameLower.includes('bread') || nameLower.includes('рис') || nameLower.includes('хлеб')) return 'grain';
    return 'other';
  };

  const handleAsk = useCallback(() => {
    if (__DEV__) {
      console.log('[AnalysisResults] Opening AI Assistant with context:', {
        dishName: analysisResult?.dishName,
        hasIngredients: !!analysisResult?.ingredients,
        ingredientsCount: analysisResult?.ingredients?.length || 0,
        hasHealthScore: !!analysisResult?.healthScore,
      });
    }

    setShowAiAssistant(true);
  }, [analysisResult]);



  // Removed unused function: handleSave



  const renderImage = (uri, style, showBadge = false) => {
    if (uri) {
      // Debug log removed to reduce console spam

      return (
        <>
          <Image
            source={{ uri }}
            style={style}
            resizeMode="cover"
            onError={(error) => {
              console.error('[AnalysisResults] Image load error:', error, 'URI:', uri);
            }}
            onLoad={() => {
              if (__DEV__) {
                console.log('[AnalysisResults] Image loaded successfully:', uri);
              }
            }}
          />
          {showBadge && (
            <View style={styles.successOverlay}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            </View>
          )}
        </>
      );
    }

    if (__DEV__) {
      console.warn('[AnalysisResults] No image URI provided for renderImage');
    }

    return (
      <View style={[style, styles.imageFallback]}>
        <Ionicons name="image-outline" size={36} color={colors.textTertiary} />
      </View>
    );
  };

  // P2.3: Optimistic UI - показываем skeleton на экране результатов с изображением (если есть)
  if (!analysisResult || isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={navigateToDashboard}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('analysis.title')}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Show image if available during analysis */}
          {baseImageUri && (
            <View style={styles.imageContainer}>
              {renderImage(baseImageUri, styles.resultImage, false)}
            </View>
          )}

          {/* Pending state with rotating phrases for better UX */}
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.textPrimary, marginTop: 16, fontSize: 18, fontWeight: '600' }]}>
              {analysisPhrases[analysisPhraseIndex]}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 8, fontSize: 14 }]}>
              {t('analysis.analyzingSubtitle') || 'This may take a few seconds'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // const totalCaloriesLabel = formatCalories(analysisResult.totalCalories); // Unused
  // const totalProteinLabel = formatMacro(analysisResult.totalProtein); // Unused
  // const totalCarbsLabel = formatMacro(analysisResult.totalCarbs); // Unused
  // const totalFatLabel = formatMacro(analysisResult.totalFat); // Unused
  // const totalCaloriesLabel = formatCalories(analysisResult.totalCalories); // Unused
  // const totalProteinLabel = formatMacro(analysisResult.totalProtein); // Unused
  // const totalCarbsLabel = formatMacro(analysisResult.totalCarbs); // Unused
  // const totalFatLabel = formatMacro(analysisResult.totalFat); // Unused

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation && typeof navigation.reset === 'function') {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Dashboard' } }],
              });
            } else if (navigation && typeof navigation.navigate === 'function') {
              navigation.navigate('MainTabs', { screen: 'Dashboard' });
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{/* Empty */}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
      >
        {/* A. Hero Block */}
        <View style={styles.heroContainer}>
          {(() => {
            const imageSource = previewImage ||
              analysisResult?.imageUrl ||
              analysisResult?.imageUri ||
              analysisResult?.image?.url ||
              analysisResult?.data?.imageUrl ||
              null;

            if (imageSource) {
              return (
                <TouchableOpacity
                  style={styles.heroImageWrapper}
                  activeOpacity={0.9}
                  onPress={() => setShowImageModal(true)}
                >
                  {renderImage(imageSource, styles.heroImage, false)}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.heroGradient}
                  >
                    <Text style={styles.heroTitle} numberOfLines={2}>
                      {analysisResult?.dishName}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }
            return (
              <View style={styles.heroTextWrapper}>
                <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                  {analysisResult?.dishName}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* B. Summary Block Uses Chips */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryChip, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={styles.summaryValue}>{Math.round(analysisResult?.totalCalories || 0)}</Text>
            <Text style={styles.summaryLabel}>{t('analysis.kcal') || 'kcal'}</Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={styles.summaryValue}>{Math.round(analysisResult?.totalProtein || 0)} {t('analysis.grams')}</Text>
            <Text style={styles.summaryLabel}>{t('analysis.proteinShort') || 'Prot'}</Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={styles.summaryValue}>{Math.round(analysisResult?.totalCarbs || 0)} {t('analysis.grams')}</Text>
            <Text style={styles.summaryLabel}>{t('analysis.carbsShort') || 'Carb'}</Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={styles.summaryValue}>{Math.round(analysisResult?.totalFat || 0)} {t('analysis.grams')}</Text>
            <Text style={styles.summaryLabel}>{t('analysis.fatShort') || 'Fat'}</Text>
          </View>
        </View>

        {/* C. Health Score */}
        {analysisResult?.healthScore && (
          <View style={styles.sectionContainer}>
            <HealthScoreCard
              healthScore={analysisResult.healthScore}
              dishName={analysisResult.dishName}
            />
          </View>
        )}

        {/* E. Ingredients */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('analysis.ingredients') || 'Ingredients'}</Text>
          <View style={styles.ingredientsList}>
            {(() => {
              const ingredients = analysisResult?.ingredients || [];
              if (ingredients.length === 0) {
                return (
                  <Text style={styles.emptyText}>{t('analysis.noIngredients')}</Text>
                );
              }
              return ingredients.map((ing, idx) => (
                <SwipeableIngredientItem
                  key={ing.id || idx}
                  ingredient={ing}
                  index={idx}
                  allowEditing={allowEditing}
                  onPress={() => handleCorrect(ing, idx)}
                  onDelete={(item, i) => handleDeleteItem(item?.id || i)}
                />
              ));
            })()}
          </View>

          {allowEditing && (
            <TouchableOpacity
              style={[styles.addIngredientButton, { borderColor: colors.primary }]}
              onPress={handleAddItem}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addIngredientText, { color: colors.primary }]}>
                {t('analysis.addIngredient') || 'Add Ingredient'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* F. Bottom CTA */}
      <View style={[styles.bottomContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleAsk}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryButtonText}>
            {t('analysis.askAi') || 'Ask AI About This Dish'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Assistant Modal */}
      <AiAssistant
        visible={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
        mealContext={analysisResult ? {
          dishName: analysisResult.dishName,
          ingredients: analysisResult.ingredients || [],
          totalCalories: analysisResult.totalCalories,
          totalProtein: analysisResult.totalProtein,
          totalCarbs: analysisResult.totalCarbs,
          totalFat: analysisResult.totalFat,
          healthScore: analysisResult.healthScore,
          imageUri: baseImageUri,
        } : null}
      />

      {/* Full Screen Image Modal */}
      <FullScreenImageModal
        visible={showImageModal}
        imageUri={previewImage || analysisResult?.imageUrl || analysisResult?.imageUri}
        onClose={() => setShowImageModal(false)}
      />

      {/* Edit Modal */}
      {allowEditing && editingItem && (
        <EditFoodItemModal
          visible={!!editingItem}
          onClose={() => {
            setEditingItem(null);
            setEditingIndex(null);
            setIsAddingItem(false);
          }}
          item={editingItem}
          onSave={handleSaveEdit}
          index={editingIndex}
        />
      )}
      {/* Re-analyzing Overlay */}
      {isReanalyzing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
            {t('analysis.processing') || 'Processing...'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (tokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 10,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: tokens.colors.textPrimary,
    },
    headerButton: {
      width: 24,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 80, // Space for floating bottom bar
    },
    heroContainer: {
      marginBottom: 24,
      alignItems: 'center',
    },
    heroImageWrapper: {
      width: '100%',
      height: 320,
      position: 'relative',
    },
    heroImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    heroGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 160,
      justifyContent: 'flex-end',
      padding: 24,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '800',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    heroTextWrapper: {
      padding: 32,
      alignItems: 'center',
    },
    summaryContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 20,
      marginBottom: 32,
    },
    summaryChip: {
      flexDirection: 'row',
      alignItems: 'baseline',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      gap: 4,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.colors.textPrimary,
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: tokens.colors.textSecondary,
    },
    sectionContainer: {
      paddingHorizontal: 20,
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: tokens.colors.textPrimary,
      marginBottom: 16,
    },
    ingredientsList: {
      gap: 8,
    },
    bottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      paddingBottom: 34,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 10,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    emptyText: {
      textAlign: 'center',
      color: tokens.colors.textSecondary,
      padding: 24,
    },
    // Keep Fallback styles just in case
    imageFallback: {
      width: '100%',
      height: 240,
      backgroundColor: tokens.colors.surfaceMuted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successOverlay: {
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 20,
      padding: 4,
    },
    imageContainer: {
      width: '100%',
      height: 240,
      marginBottom: 16,
    },
    // Required for renderImage
    resultImage: {
      width: '100%',
      height: '100%',
    },
    addIngredientButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginTop: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 12,
      gap: 8,
    },
    addIngredientText: {
      fontSize: 16,
      fontWeight: '600',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
  });
