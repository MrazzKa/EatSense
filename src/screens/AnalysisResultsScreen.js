import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import FoodCompatibilityCard from '../components/FoodCompatibilityCard';
import CarcinogenicRiskCard from '../components/CarcinogenicRiskCard';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { mapLanguageToLocale } from '../utils/locale';
import AppCard from '../components/common/AppCard';
import FullScreenImageModal from '../components/common/FullScreenImageModal';
import { clientLog } from '../utils/clientLog';
import { formatMacro, formatCalories } from '../utils/nutritionFormat';
import AiAssistant from '../components/AiAssistant';
// GestureHandlerRootView is now in App.js root

const formatTimestamp = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '';
  }
};

export default function AnalysisResultsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params || {};
  const capturedImageUri = routeParams.imageUri ?? null;
  const localPreviewUri = routeParams.localPreviewUri ?? null; // From pending analysis
  const initialAnalysisParam = routeParams.analysisResult ?? null;
  const readOnly = Boolean(routeParams.readOnly);
  const pendingStatus = routeParams.status ?? null; // 'processing', 'failed', 'needs_review', 'completed'
  // Task 5: Use imageUrl from result if available, fallback to imageUri or localPreviewUri
  // Resolve relative URLs to absolute URLs
  const baseImageUri = (() => {
    const raw = capturedImageUri || localPreviewUri || initialAnalysisParam?.imageUrl || initialAnalysisParam?.imageUri || null;
    if (!raw) return null;
    // If relative path, resolve it using ApiService
    if (raw.startsWith('/media/') || raw.startsWith('/')) {
      return ApiService.resolveMediaUrl(raw);
    }
    return raw;
  })();
  const { colors, tokens } = useTheme();
  const { t, language } = useI18n();

  const [isAnalyzing, setIsAnalyzing] = useState(false); // Убрали отдельное окно процесса анализа
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisId, setAnalysisId] = useState(routeParams.analysisId || null); // Сохраняем analysisId в состоянии
  const [fadeAnim] = useState(new Animated.Value(0));
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const subduedColor = colors.textSecondary || colors.textMuted || '#6B7280';
  const tertiaryColor = colors.textSubdued || colors.textTertiary || subduedColor;
  const allowEditing = !readOnly;

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
      const effectiveFallback = fallbackImage !== undefined
        ? fallbackImage
        : (routeParams.source !== 'text' ? baseImageUri : null);

      // Log API response only when explicitly debugging
      // console.log('[AnalysisResults] Raw API response:', JSON.stringify(raw, null, 2));

      if (!raw) {
        return null;
      }

      const toNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const toMacro = (value) => Math.round(toNumber(value) * 10) / 10;

      // Поддерживаем как старый формат (ingredients/items на верхнем уровне), так и новый (data.ingredients или data.items)
      const ingredientsSource = raw.data?.ingredients || raw.data?.items || raw.ingredients || raw.items || [];
      const normalizedIngredients = (Array.isArray(ingredientsSource) ? ingredientsSource : []).map((item) => {
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
          id: item.id || String(Math.random()),
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
          // Prefer localized dish name, fallback to original, then derived
          let name = raw.data?.dishNameLocalized || raw.data?.originalDishName ||
            raw.dishName || raw.name || normalizedIngredients[0]?.name || 'Food Analysis';

          // Remove "and more" suffix if present (backend adds it for brevity)
          // Replace with ellipsis if needed for UI consistency
          if (name.includes(' and more') || name.includes(' и другое') || name.includes(' және басқалары')) {
            name = name.replace(/\s+(and more|и другое|және басқалары)$/i, '');
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
    [baseImageUri, routeParams.analysisId, routeParams.source],
  );

  const applyResult = useCallback(
    (payload, imageOverride, analysisIdOverride) => {
      const normalized = normalizeAnalysis(payload, imageOverride);
      if (!normalized) {
        setIsAnalyzing(false);
        return;
      }

      // Сохраняем analysisId если он есть
      const idToSave = analysisIdOverride || normalized.analysisId || normalized.id || analysisId;
      if (idToSave) {
        setAnalysisId(idToSave);
      }

      fadeAnim.setValue(0);
      setAnalysisResult(normalized);
      setIsAnalyzing(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    },
    [fadeAnim, normalizeAnalysis, analysisId, setAnalysisId],
  );

  useEffect(() => {
    if (initialAnalysisParam) {
      const timeoutId = setTimeout(() => {
        applyResult(initialAnalysisParam, baseImageUri);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    // Handle analysisId from route params (from DescribeFoodModal or other sources)
    const analysisIdFromRoute = routeParams.analysisId;
    if (analysisIdFromRoute) {
      setIsAnalyzing(true);
      let cancelled = false;

      const pollForResults = async () => {
        if (cancelled) return;

        try {
          let attempts = 0;
          const maxAttempts = 60;

          const poll = async () => {
            if (cancelled) return;

            try {
              const status = await ApiService.getAnalysisStatus(analysisIdFromRoute);
              console.log(`[AnalysisResultsScreen] Polling analysis ${analysisIdFromRoute}, status:`, status.status);

              if (status.status === 'COMPLETED' || status.status === 'completed' || status.status === 'NEEDS_REVIEW' || status.status === 'needs_review') {
                const result = await ApiService.getAnalysisResult(analysisIdFromRoute);
                console.log(`[AnalysisResultsScreen] Analysis ${analysisIdFromRoute} completed, result:`, result);
                if (!cancelled) {
                  applyResult(result, null);
                }
              } else if (status.status === 'FAILED' || status.status === 'failed') {
                console.error(`[AnalysisResultsScreen] Analysis ${analysisIdFromRoute} failed`);
                if (!cancelled) {
                  showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
                }
              } else if (status.status === 'PROCESSING' || status.status === 'processing' || status.status === 'PENDING' || status.status === 'pending') {
                if (attempts < maxAttempts) {
                  attempts += 1;
                  setTimeout(poll, 1000);
                } else {
                  console.error(`[AnalysisResultsScreen] Analysis ${analysisIdFromRoute} timeout after ${maxAttempts} attempts`);
                  if (!cancelled) {
                    showAnalysisError('analysis.timeoutTitle', 'analysis.timeoutMessage');
                  }
                }
              } else {
                console.warn(`[AnalysisResultsScreen] Unknown analysis status: ${status.status}`);
                if (attempts < maxAttempts) {
                  attempts += 1;
                  setTimeout(poll, 1000);
                } else {
                  if (!cancelled) {
                    showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
                  }
                }
              }
            } catch (error) {
              console.error(`[AnalysisResultsScreen] Polling error for analysis ${analysisIdFromRoute}:`, error);
              if (attempts < maxAttempts) {
                attempts += 1;
                setTimeout(poll, 2000); // Longer delay on error
              } else {
                if (!cancelled) {
                  showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
                }
              }
            }
          };

          poll();
        } catch (error) {
          console.error(`[AnalysisResultsScreen] Failed to start polling for analysis ${analysisIdFromRoute}:`, error);
          if (!cancelled) {
            showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
          }
        }
      };

      pollForResults();

      return () => {
        cancelled = true;
      };
    }

    // Handle text description analysis (legacy - for backward compatibility)
    const description = routeParams.description;
    if (description) {
      setIsAnalyzing(true);
      const runTextAnalysis = async () => {
        try {
          const locale = mapLanguageToLocale(language);
          const analysisResponse = await ApiService.analyzeText(description, locale);
          console.log('[AnalysisResultsScreen] Text analysis response:', analysisResponse);

          if (analysisResponse?.analysisId) {
            // Navigate with analysisId to use the polling logic above
            // This will trigger the useEffect again with analysisId
            if (navigation && typeof navigation.replace === 'function') {
              navigation.replace('AnalysisResults', {
                analysisId: analysisResponse.analysisId,
              });
            } else {
              // Fallback: poll directly
              let attempts = 0;
              const maxAttempts = 60;
              const pollForResults = async () => {
                try {
                  const status = await ApiService.getAnalysisStatus(analysisResponse.analysisId);
                  if (status.status === 'completed' || status.status === 'COMPLETED') {
                    const result = await ApiService.getAnalysisResult(analysisResponse.analysisId);
                    applyResult(result, null);
                  } else if (status.status === 'failed' || status.status === 'FAILED') {
                    showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
                  } else if (attempts < maxAttempts) {
                    attempts += 1;
                    setTimeout(pollForResults, 1000);
                  } else {
                    showAnalysisError('analysis.timeoutTitle', 'analysis.timeoutMessage');
                  }
                } catch (error) {
                  console.error('Text analysis polling error:', error);
                  showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
                }
              };
              pollForResults();
            }
          } else {
            console.error('[AnalysisResultsScreen] Text analysis response has no analysisId:', analysisResponse);
            showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
          }
        } catch (error) {
          console.error('[AnalysisResultsScreen] Text analysis failed:', error);
          showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
        }
      };
      runTextAnalysis();
      return;
    }

    if (!capturedImageUri) {
      showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
      return;
    }

    let cancelled = false;

    const finish = (payload) => {
      if (!cancelled) {
        applyResult(payload, capturedImageUri);
      }
    };

    const run = async () => {
      try {
        await clientLog('Analysis:start', { source: routeParams.source || 'unknown' }).catch(() => { });

        try {
          await ApiService.uploadImage(capturedImageUri);
          await clientLog('Analysis:imageUploaded').catch(() => { });
        } catch (uploadError) {
          console.log('Upload failed, using demo mode:', uploadError);
          await clientLog('Analysis:uploadFailed', { message: uploadError?.message || String(uploadError) }).catch(() => { });
        }

        let analysisResponse;
        try {
          const locale = mapLanguageToLocale(language);

          // P2.3: Optimistic UI - show loading state immediately
          setIsAnalyzing(true);

          const foodDescription = routeParams.foodDescription;
          analysisResponse = await ApiService.analyzeImage(capturedImageUri, locale, foodDescription);
          await clientLog('Analysis:apiCalled', {
            hasAnalysisId: !!analysisResponse?.analysisId,
            hasResult: !!analysisResponse?.items,
          }).catch(() => { });

          // P2.3: If we have immediate results, show them optimistically
          if (analysisResponse && analysisResponse.items && analysisResponse.items.length > 0 && !analysisResponse.analysisId) {
            // Immediate result available - show it right away
            const optimisticResult = normalizeAnalysis(analysisResponse, capturedImageUri);
            if (optimisticResult) {
              fadeAnim.setValue(0);
              setAnalysisResult(optimisticResult);
              setIsAnalyzing(false);
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start();
              return; // Early return, no polling needed
            }
          }
        } catch (analysisError) {
          console.error('[AnalysisResultsScreen] Analysis API failed:', analysisError);
          await clientLog('Analysis:apiFailed', {
            message: analysisError?.message || String(analysisError),
            status: analysisError?.status,
            timeout: analysisError?.message?.includes('timeout'),
          }).catch(() => { });

          cancelled = true;
          setIsAnalyzing(false);
          showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
          return;
        }

        if (analysisResponse.analysisId) {
          let attempts = 0;
          const maxAttempts = 60;

          const pollForResults = async () => {
            if (cancelled) return;
            try {
              // P2.3: Use getAnalysisResult which now returns status-aware response
              const response = await ApiService.getAnalysisResult(analysisResponse.analysisId);

              // Handle status-aware response
              const currentStatus = response.status?.toUpperCase() || 'PENDING';

              if (currentStatus === 'COMPLETED') {
                const result = response.data || response;
                await clientLog('Analysis:completed', {
                  hasResult: !!result,
                  dishName: result?.dishName || 'unknown',
                  analysisId: analysisIdFromRoute,
                }).catch(() => { });
                // Сохраняем analysisId при получении результата
                if (analysisIdFromRoute) {
                  setAnalysisId(analysisIdFromRoute);
                }
                finish(result);
              } else if (currentStatus === 'FAILED') {
                await clientLog('Analysis:statusFailed').catch(() => { });
                cancelled = true;
                setIsAnalyzing(false);
                const errorMessage = response.error || t('analysis.errorMessage');
                Alert.alert(
                  t('analysis.errorTitle'),
                  errorMessage,
                  [{ text: t('common.ok'), onPress: () => navigateToDashboard() }],
                  { cancelable: false },
                );
              } else if (currentStatus === 'PENDING' || currentStatus === 'PROCESSING') {
                // Continue polling for PENDING/PROCESSING
                if (attempts < maxAttempts) {
                  attempts += 1;
                  setTimeout(() => {
                    if (!cancelled) {
                      pollForResults();
                    }
                  }, 3000); // Poll every 3 seconds
                } else {
                  await clientLog('Analysis:timeout', { attempts }).catch(() => { });
                  cancelled = true;
                  setIsAnalyzing(false);
                  showAnalysisError('analysis.timeoutTitle', 'analysis.timeoutMessage');
                }
              } else if (attempts < maxAttempts) {
                // Unknown status, continue polling
                attempts += 1;
                setTimeout(() => {
                  if (!cancelled) {
                    pollForResults();
                  }
                }, 3000);
              } else {
                await clientLog('Analysis:timeout', { attempts }).catch(() => { });
                cancelled = true;
                showAnalysisError('analysis.timeoutTitle', 'analysis.timeoutMessage');
              }
            } catch (error) {
              console.error('Polling error:', error);
              if (!cancelled) {
                await clientLog('Analysis:pollingError', {
                  message: error?.message || String(error),
                }).catch(() => { });
                cancelled = true;
                showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
              }
            }
          };

          pollForResults();
        } else {
          finish(analysisResponse);
        }
      } catch (error) {
        console.error('Analysis error:', error);
        await clientLog('Analysis:unhandledError', {
          message: error?.message || String(error),
        }).catch(() => { });
        cancelled = true;
        showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [applyResult, baseImageUri, capturedImageUri, initialAnalysisParam, showAnalysisError, fadeAnim, language, navigateToDashboard, normalizeAnalysis, routeParams.description, routeParams.source, routeParams.analysisId, t, navigation, setAnalysisId]);

  const autoSaveInfo = analysisResult?.autoSave || null;
  const hasAutoSave = Boolean(autoSaveInfo?.mealId);
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

  const handleFix = useCallback(async () => {
    // Используем analysisId из состояния, если он есть, иначе из routeParams или результата
    const currentAnalysisId = analysisId || routeParams.analysisId || analysisResult?.analysisId || analysisResult?.id;

    if (!currentAnalysisId) {
      Alert.alert(
        t('common.error') || 'Ошибка',
        t('analysis.fixError') || 'Не удалось исправить: ID анализа не найден',
      );
      return;
    }

    Alert.alert(
      t('analysis.fixTitle') || 'Исправление результата',
      t('analysis.fixMessage') || 'ИИ снова проанализирует это блюдо более внимательно, чтобы убрать любые несоответствия или ошибки.',
      [
        {
          text: t('common.cancel') || 'Отмена',
          style: 'cancel',
        },
        {
          text: t('analysis.fixConfirm') || 'Исправить',
          onPress: async () => {
            setIsReanalyzing(true);
            try {
              // Вызываем reanalyze с mode='review' для более внимательного анализа
              const fixed = await ApiService.reanalyzeAnalysisWithMode(currentAnalysisId, 'review');
              console.log('[AnalysisResultsScreen] Fix response:', fixed);

              if (fixed) {
                const normalized = normalizeAnalysis(fixed, baseImageUri);
                if (normalized) {
                  if (normalized.analysisId || normalized.id) {
                    setAnalysisId(normalized.analysisId || normalized.id);
                  }
                  applyResult(normalized, baseImageUri);
                  Alert.alert(
                    t('common.success') || 'Успешно',
                    t('analysis.fixSuccess') || 'Анализ обновлен с более точными результатами',
                  );
                } else {
                  throw new Error('Failed to normalize fixed result');
                }
              } else {
                throw new Error('Empty response from fix API');
              }
            } catch (error) {
              console.error('[AnalysisResultsScreen] Fix failed:', error);
              const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                t('analysis.fixError') ||
                'Не удалось исправить анализ. Попробуйте еще раз.';

              Alert.alert(
                t('common.error') || 'Ошибка',
                errorMessage
              );
            } finally {
              setIsReanalyzing(false);
            }
          },
        },
      ]
    );
  }, [analysisId, routeParams.analysisId, analysisResult, baseImageUri, normalizeAnalysis, applyResult, setAnalysisId, t]);

  // Removed unused function: handleSave

  const handleViewMeal = () => {
    if (hasAutoSave && autoSaveInfo?.mealId) {
      // Navigate to Recently tab where the saved meal is
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Recently' } }],
        });
      }
    } else {
      // If no mealId, just navigate to Recently
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('MainTabs', { screen: 'Recently' });
      }
    }
  };

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

          {/* Pending state with better UX */}
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.textPrimary, marginTop: 16, fontSize: 18, fontWeight: '600' }]}>
              {t('analysis.analyzing') || 'Analyzing your meal...'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 8, fontSize: 14 }]}>
              {t('analysis.analyzingSubtitle') || 'This may take a few seconds'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const totalCaloriesLabel = formatCalories(analysisResult.totalCalories);
  // formatMacro already includes " g" unit, so we don't need to add another "g"
  const totalProteinLabel = formatMacro(analysisResult.totalProtein);
  const totalCarbsLabel = formatMacro(analysisResult.totalCarbs);
  const totalFatLabel = formatMacro(analysisResult.totalFat);

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
      paddingBottom: 120, // Space for floating bottom bar
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
  });
