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
import { clientLog } from '../utils/clientLog';
import { formatMacro, formatCalories } from '../utils/nutritionFormat';
import AiAssistant from '../components/AiAssistant';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
  const initialAnalysisParam = routeParams.analysisResult ?? null;
  const readOnly = Boolean(routeParams.readOnly);
  // Task 5: Use imageUrl from result if available, fallback to imageUri
  const baseImageUri = capturedImageUri || initialAnalysisParam?.imageUrl || initialAnalysisParam?.imageUri || null;
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
    (raw, fallbackImage = baseImageUri) => {
      if (!raw) {
        return null;
      }

      const toNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const toMacro = (value) => Math.round(toNumber(value) * 10) / 10;

      // Поддерживаем как старый формат (ingredients/items на верхнем уровне), так и новый (data.items)
      const ingredientsSource = raw.data?.items || raw.ingredients || raw.items || [];
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
      const autoSave = raw.autoSave || raw.savedMeal || null;
      const needsReview = raw.analysisFlags?.needsReview || raw.needsReview || false;
      const isSuspicious = raw.analysisFlags?.isSuspicious || raw.isSuspicious || false;

      return {
        id: raw.id || raw.analysisId || null,
        analysisId: raw.analysisId || raw.id || routeParams.analysisId || null,
        dishName:
          raw.data?.dishNameLocalized || raw.data?.originalDishName ||
          raw.dishName ||
          raw.name ||
          normalizedIngredients[0]?.name ||
          'Food Analysis',
        imageUri: raw.imageUrl || raw.imageUri || raw.data?.imageUrl || fallbackImage || null,
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
    [baseImageUri, routeParams.analysisId],
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
              
              if (status.status === 'COMPLETED' || status.status === 'completed') {
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
        await clientLog('Analysis:start', { source: routeParams.source || 'unknown' }).catch(() => {});
        
        try {
          await ApiService.uploadImage(capturedImageUri);
          await clientLog('Analysis:imageUploaded').catch(() => {});
        } catch (uploadError) {
          console.log('Upload failed, using demo mode:', uploadError);
          await clientLog('Analysis:uploadFailed', { message: uploadError?.message || String(uploadError) }).catch(() => {});
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
          }).catch(() => {});

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
          }).catch(() => {});

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
                }).catch(() => {});
                // Сохраняем analysisId при получении результата
                if (analysisIdFromRoute) {
                  setAnalysisId(analysisIdFromRoute);
                }
                finish(result);
              } else if (currentStatus === 'FAILED') {
                await clientLog('Analysis:statusFailed').catch(() => {});
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
                  await clientLog('Analysis:timeout', { attempts }).catch(() => {});
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
                await clientLog('Analysis:timeout', { attempts }).catch(() => {});
                cancelled = true;
                showAnalysisError('analysis.timeoutTitle', 'analysis.timeoutMessage');
              }
            } catch (error) {
              console.error('Polling error:', error);
              if (!cancelled) {
                await clientLog('Analysis:pollingError', {
                  message: error?.message || String(error),
                }).catch(() => {});
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
        }).catch(() => {});
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
  const previewImage = analysisResult?.imageUrl || analysisResult?.imageUri || baseImageUri;

  // Removed unused dishTitle variable

  // Removed unused handleShare and handleReanalyze - they are replaced by handleAsk and handleFix

  const handleCorrect = (item, index) => {
    if (!allowEditing) return;
    setEditingItem(item);
    setEditingIndex(index);
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
      }).catch(() => {}); // Non-critical

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
        }).catch(() => {}); // Non-critical
      }
      
      // 3. Формируем новый список items для отправки на сервер
      const updatedItems = currentItems.map((item, idx) => {
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
    setShowAiAssistant(true);
  }, []);

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
      return (
        <>
          <Image source={{ uri }} style={style} />
          {showBadge && (
            <View style={styles.successOverlay}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            </View>
          )}
        </>
      );
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            // Navigate directly to MainTabs (Dashboard) instead of going back
            if (navigation && typeof navigation.reset === 'function') {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Dashboard' } }],
              });
            } else if (navigation && typeof navigation.navigate === 'function') {
              navigation.navigate('MainTabs', { screen: 'Dashboard' });
            }
          }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('analysis.title')}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Image with gradient overlay */}
          <View style={styles.imageContainer}>
            {renderImage(previewImage, styles.resultImage, true)}
            {previewImage && (
              <View style={styles.imageGradientOverlay}>
                <Text style={styles.dishNameOverlay}>{analysisResult?.dishName}</Text>
              </View>
            )}
          </View>

          {/* Dish Name (fallback if no image) */}
          {!previewImage && (
            <View>
              <View style={styles.dishNameContainer}>
                <Text style={styles.dishName}>{analysisResult?.dishName}</Text>
              </View>
            </View>
          )}

          {/* Total Nutrition */}
          <View>
            <View style={styles.nutritionContainer}>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionTitle}>{t('analysis.totalNutrition')}</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{totalCaloriesLabel}</Text>
                  <Text style={styles.nutritionLabel}>{t('analysis.calories')}</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{totalProteinLabel}</Text>
                  <Text style={styles.nutritionLabel}>{t('dashboard.protein')}</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{totalCarbsLabel}</Text>
                  <Text style={styles.nutritionLabel}>{t('dashboard.carbs')}</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{totalFatLabel}</Text>
                  <Text style={styles.nutritionLabel}>{t('dashboard.fat')}</Text>
                </View>
              </View>
              </View>
            </View>
          </View>

          {/* Suspicious Analysis Warning Banner */}
          {analysisResult?.isSuspicious && (
            <View style={{ marginBottom: tokens.spacing.md }}>
              <AppCard style={[styles.warningCard, { backgroundColor: colors.errorBackground || '#FEE2E2', borderColor: colors.error || '#EF4444' }]}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={22} color={colors.error || '#EF4444'} />
                  <Text style={[styles.warningTitle, { color: colors.errorText || '#991B1B' }]}>
                    {t('analysis.warning.suspiciousTitle')}
                  </Text>
                </View>
                <Text style={[styles.warningDescription, { color: colors.errorText || '#991B1B' }]}>
                  {t('analysis.warning.suspiciousDescription')}
                </Text>
              </AppCard>
            </View>
          )}

          {/* Needs Review Banner */}
          {analysisResult?.needsReview && (
            <View style={{ marginBottom: tokens.spacing.md }}>
              <AppCard style={[styles.warningCard, { backgroundColor: colors.warningBackground || '#FFF3CD', borderColor: colors.warning || '#FFC107' }]}>
                <View style={styles.warningHeader}>
                  <Ionicons name="alert-circle" size={22} color={colors.warning || '#FFC107'} />
                  <Text style={[styles.warningTitle, { color: colors.warningText || '#856404' }]}>
                    {t('analysis.warning.needsReview')}
                  </Text>
                </View>
                <Text style={[styles.warningDescription, { color: colors.warningText || '#856404' }]}>
                  {t('analysis.needsReviewMessage')}
                </Text>
              </AppCard>
            </View>
          )}

          {/* Health Score */}
          {analysisResult?.healthScore && (
            <HealthScoreCard 
              healthScore={analysisResult.healthScore} 
              dishName={analysisResult.dishName}
            />
          )}

          {/* Food Compatibility */}
          {analysisResult?.data?.foodCompatibility && (
            <FoodCompatibilityCard compatibility={analysisResult.data.foodCompatibility} />
          )}

          {/* Carcinogenic Risk */}
          {analysisResult?.data?.carcinogenicRisk && (
            <CarcinogenicRiskCard risk={analysisResult.data.carcinogenicRisk} />
          )}

          {/* Auto Save Banner */}
          {hasAutoSave && (
            <View>
              <AppCard style={styles.autoSaveCard}>
                <View style={styles.autoSaveHeader}>
                  <Ionicons name="cloud-done-outline" size={22} color={colors.success} />
                  <Text style={styles.autoSaveTitle}>{t('analysis.autoSavedTitle')}</Text>
                </View>
                <Text style={[styles.autoSaveDescription, { color: subduedColor }]}>
                  {t('analysis.autoSavedDescription')}
                </Text>
                <Text style={[styles.autoSaveMeta, { color: tertiaryColor }]}>
                  {formatTimestamp(autoSaveInfo?.savedAt)}
                </Text>
              </AppCard>
            </View>
          )}

          {/* Ingredients */}
          <View>
            <View style={styles.ingredientsContainer}>
              <Text style={[styles.ingredientsTitle, { color: colors.textPrimary }]}>{t('analysis.ingredients')}</Text>
              {(analysisResult?.ingredients && Array.isArray(analysisResult.ingredients) ? analysisResult.ingredients : []).map((ingredient, index) => (
                <SwipeableIngredientItem
                  key={ingredient.id || index}
                  ingredient={ingredient}
                  index={index}
                  allowEditing={allowEditing}
                  onPress={() => handleCorrect(ingredient, index)}
                  onDelete={(item, idx) => handleDeleteItem(item?.id || idx)}
                />
              ))}
            </View>
          </View>

          {/* Ask and Fix Buttons */}
          <View style={styles.shareContainer}>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={[styles.actionButton, {
                  backgroundColor: colors.surfaceElevated || colors.surface || colors.card,
                  borderColor: colors.borderMuted || colors.border || '#E5E5EA',
                  flex: 1,
                  marginRight: 8,
                }]} 
                onPress={handleAsk}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.textPrimary || colors.text} style={styles.actionIcon} />
                <Text style={[styles.actionButtonText, { color: colors.textPrimary || colors.text }]}>
                  {t('analysis.askButton') || t('analysis.ask') || 'Спросить'}
                </Text>
              </TouchableOpacity>
              {allowEditing && (
                <TouchableOpacity 
                  style={[styles.actionButton, {
                    backgroundColor: colors.surfaceElevated || colors.surface || colors.card,
                    borderColor: colors.borderMuted || colors.border || '#E5E5EA',
                    flex: 1,
                    marginLeft: 8,
                  }]} 
                  onPress={handleFix}
                  activeOpacity={0.8}
                  disabled={isReanalyzing}
                >
                  {isReanalyzing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="refresh-outline" size={18} color={colors.textPrimary || colors.text} style={styles.actionIcon} />
                  )}
                  <Text style={[styles.actionButtonText, { color: colors.textPrimary || colors.text }]}>
                    {t('analysis.fixButton') || t('analysis.fix') || 'Исправить'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Auto-save info only - no save button since analysis is auto-saved */}
          {hasAutoSave && (
            <View style={styles.autoSaveActions}>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={handleViewMeal}>
                <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  {t('analysis.viewMeal')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        </Animated.View>

        {/* Edit Modal */}
        {allowEditing && editingItem && (
          <EditFoodItemModal
            visible={!!editingItem}
            onClose={() => {
              setEditingItem(null);
              setEditingIndex(null);
            }}
            item={editingItem}
            onSave={handleSaveEdit}
            index={editingIndex}
          />
        )}

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
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const createStyles = (tokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tokens.colors.background,
    },
    content: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: tokens.colors.border,
      backgroundColor: tokens.states.surface.base ?? tokens.colors.surface,
    },
    headerTitle: {
      color: tokens.colors.textPrimary,
      fontSize: tokens.typography.headingS.fontSize,
      fontWeight: tokens.typography.headingS.fontWeight,
    },
    headerButton: {
      width: 24,
    },
    scrollView: {
      flex: 1,
    },
    analyzingRoot: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    analyzingContainer: {
      width: '90%',
      borderRadius: tokens.radii.xl,
      overflow: 'hidden',
      backgroundColor: tokens.colors.surface,
      padding: tokens.spacing.lg,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.lg),
      gap: tokens.spacing.lg,
    },
    imageContainer: {
      position: 'relative',
    },
    analyzingImage: {
      width: '100%',
      height: 240,
      borderRadius: tokens.radii.lg,
    },
    resultImage: {
      width: '100%',
      height: 240,
      borderRadius: tokens.radii.lg,
      marginTop: tokens.spacing.lg,
      resizeMode: 'cover',
    },
    imageGradientOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 120,
      borderRadius: tokens.radii.lg,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay for better text contrast
      justifyContent: 'flex-end',
      padding: tokens.spacing.lg,
      paddingBottom: tokens.spacing.xl,
    },
    dishNameOverlay: {
      color: '#FFFFFF',
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      textAlign: 'left',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
      lineHeight: tokens.typography.headingM.lineHeight,
    },
    analyzingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: tokens.colors.overlay || 'rgba(0,0,0,0.65)',
    },
    analyzingContent: {
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.xl,
    },
    analyzingIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: tokens.colors.overlayTint,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: tokens.spacing.lg,
    },
    successOverlay: {
      position: 'absolute',
      top: tokens.spacing.md,
      right: tokens.spacing.md,
      backgroundColor: tokens.colors.surfaceMuted,
      borderRadius: tokens.radii.md,
      padding: tokens.spacing.xs,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
    },
    analyzingText: {
      fontSize: tokens.typography.subtitle1?.fontSize || tokens.typography.headingS.fontSize,
      fontWeight: '600',
      textAlign: 'center',
    },
    analyzingSubtext: {
      marginTop: 4,
      textAlign: 'center',
      fontSize: tokens.typography.body.fontSize,
    },
    progressSteps: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
    },
    step: {
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    stepIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepCompleted: {
      backgroundColor: tokens.colors.success,
    },
    stepActive: {
      backgroundColor: tokens.colors.primary,
    },
    stepPending: {
      backgroundColor: tokens.colors.borderMuted,
    },
    stepText: {
      marginTop: 8,
      fontSize: tokens.typography.caption.fontSize,
      color: tokens.colors.textSecondary,
      textAlign: 'center',
    },
    progressContainer: {
      width: '100%',
      paddingHorizontal: tokens.spacing.xl,
      gap: tokens.spacing.xs,
    },
    progressBar: {
      width: '100%',
      height: 8,
      borderRadius: tokens.radii.sm,
      overflow: 'hidden',
      backgroundColor: tokens.colors.surfaceMuted,
    },
    progressFill: {
      height: '100%',
      borderRadius: tokens.radii.sm,
      backgroundColor: tokens.colors.primary,
    },
    progressText: {
      fontSize: tokens.typography.caption.fontSize,
      color: tokens.colors.textSecondary,
      textAlign: 'center',
    },
    dishNameContainer: {
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.xl,
      alignItems: 'center',
    },
    dishName: {
      color: tokens.colors.textPrimary,
      fontSize: tokens.typography.headingL.fontSize,
      fontWeight: tokens.typography.headingL.fontWeight,
      textAlign: 'center',
    },
    nutritionContainer: {
      paddingHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.xxl,
    },
    nutritionCard: {
      borderRadius: tokens.radii.lg,
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      padding: tokens.spacing.xl,
      ...(tokens.states.cardShadow || tokens.elevations.md),
      gap: tokens.spacing.lg,
    },
    nutritionTitle: {
      color: tokens.colors.textPrimary,
      fontSize: tokens.typography.headingS.fontSize,
      fontWeight: tokens.typography.headingS.fontWeight,
    },
    nutritionGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: tokens.spacing.md,
    },
    nutritionItem: {
      flex: 1,
      alignItems: 'center',
    },
    nutritionValue: {
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      color: tokens.colors.textPrimary,
    },
    nutritionLabel: {
      fontSize: tokens.typography.caption.fontSize,
      color: tokens.colors.textSecondary,
    },
    ingredientsContainer: {
      paddingHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.xxl,
      gap: tokens.spacing.sm,
    },
    ingredientsTitle: {
      color: tokens.colors.textPrimary,
      fontSize: tokens.typography.headingS.fontSize,
      fontWeight: tokens.typography.headingS.fontWeight,
    },
    ingredientItem: {
      backgroundColor: tokens.colors.card,
      borderRadius: tokens.radii.md,
      padding: tokens.spacing.lg,
      marginBottom: tokens.spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: tokens.colors.borderMuted,
      ...(tokens.states.cardShadow || tokens.elevations.sm),
    },
    ingredientItemDisabled: {
      opacity: 0.65,
    },
    editIcon: {
      padding: tokens.spacing.xs,
      marginLeft: tokens.spacing.sm,
    },
    ingredientInfo: {
      flex: 1,
      gap: tokens.spacing.xs,
    },
    ingredientName: {
      color: tokens.colors.textPrimary,
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    ingredientWeight: {
      color: tokens.colors.textSecondary,
      fontSize: tokens.typography.caption.fontSize,
    },
    ingredientNutrition: {
      alignItems: 'flex-end',
      gap: tokens.spacing.xs,
    },
    ingredientCalories: {
      color: tokens.colors.primary,
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    ingredientMacros: {
      color: tokens.colors.textSecondary,
      fontSize: tokens.typography.caption.fontSize,
    },
    shareContainer: {
      marginTop: 24,
      marginBottom: 32,
      alignItems: 'center',
    },
    actionButtonsRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
      paddingHorizontal: tokens.spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: tokens.radii.md || 8,
      borderWidth: 1,
    },
    actionIcon: {
      marginRight: 8,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
    },
    shareIcon: {
      marginRight: 8,
    },
    shareButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    correctButton: {
      flex: 1,
      backgroundColor: tokens.colors.warningTint,
      borderRadius: tokens.radii.md,
      paddingVertical: tokens.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
    },
    correctButtonText: {
      color: tokens.colors.warning,
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    saveButton: {
      backgroundColor: tokens.states.primary.base,
      marginHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.xxxl,
      borderRadius: tokens.radii.md,
      paddingVertical: tokens.spacing.lg,
      alignItems: 'center',
    },
    saveButtonInline: {
      width: '100%',
      marginHorizontal: 0,
      marginBottom: 0,
    },
    saveButtonText: {
      color: tokens.states.primary.on,
      fontSize: tokens.typography.bodyStrong.fontSize + 1,
      fontWeight: tokens.typography.headingS.fontWeight,
    },
    autoSaveCard: {
      marginHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.lg,
      gap: tokens.spacing.xs,
    },
    autoSaveHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    autoSaveTitle: {
      color: tokens.colors.textPrimary,
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    autoSaveDescription: {
      color: tokens.colors.textSecondary,
      fontSize: tokens.typography.body.fontSize,
      lineHeight: tokens.typography.body.lineHeight,
    },
    autoSaveMeta: {
      fontSize: tokens.typography.caption.fontSize,
      color: tokens.colors.textTertiary,
    },
    warningCard: {
      marginHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.lg,
      gap: tokens.spacing.xs,
      borderWidth: 1,
    },
    warningHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    warningTitle: {
      fontSize: tokens.typography.bodyStrong.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
    },
    warningDescription: {
      fontSize: tokens.typography.body.fontSize,
      lineHeight: tokens.typography.body.lineHeight,
    },
    autoSaveActions: {
      paddingHorizontal: tokens.spacing.xl,
      marginBottom: tokens.spacing.xxxl,
      gap: tokens.spacing.md,
    },
    secondaryButton: {
      width: '100%',
      borderWidth: 1,
      borderColor: tokens.colors.primary,
      borderRadius: tokens.radii.md,
      paddingVertical: tokens.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    secondaryButtonText: {
      fontSize: tokens.typography.body.fontSize,
      fontWeight: tokens.typography.bodyStrong.fontWeight,
      color: tokens.colors.primary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: tokens.spacing.xl,
    },
    emptyText: {
      marginTop: tokens.spacing.md,
      textAlign: 'center',
    },
    imageFallback: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: tokens.colors.surfaceMuted,
    },
  });
