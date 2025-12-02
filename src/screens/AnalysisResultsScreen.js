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
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import ApiService from '../services/apiService';
import { EditFoodItemModal } from '../components/EditFoodItemModal';
import { HealthScoreCard } from '../components/HealthScoreCard';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { mapLanguageToLocale } from '../utils/locale';
import AppCard from '../components/common/AppCard';
import { clientLog } from '../utils/clientLog';
import { formatMacro, formatCalories } from '../utils/nutritionFormat';

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

  const [isAnalyzing, setIsAnalyzing] = useState(!initialAnalysisParam);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

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
        t(titleKey) || t('analysis.errorTitle') || 'Analysis unavailable',
        t(messageKey) ||
          t('analysis.errorMessage') ||
          'The analysis service is temporarily unavailable. Please try again later.',
        [
          {
            text: t('common.ok') || 'OK',
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

      const ingredientsSource = raw.ingredients || raw.items || [];
      const normalizedIngredients = (Array.isArray(ingredientsSource) ? ingredientsSource : []).map((item) => {
        const caloriesFromApi = Math.max(0, Math.round(toNumber(item.calories ?? item.kcal)));
        const hasMacros = Number.isFinite(toNumber(item.protein)) || Number.isFinite(toNumber(item.carbs)) || Number.isFinite(toNumber(item.fat));
        let calories = caloriesFromApi;

        if (calories === 0 && hasMacros) {
          const p = toNumber(item.protein ?? 0);
          const c = toNumber(item.carbs ?? 0);
          const f = toNumber(item.fat ?? 0);
          const recalculated = p * 4 + c * 4 + f * 9;
          calories = Math.max(1, Math.round(recalculated)); // at least 1 kcal
        }
        
        return {
          name: item.name || item.label || 'Ingredient',
          calories,
          protein: toMacro(item.protein),
          carbs: toMacro(item.carbs),
          fat: toMacro(item.fat),
          weight: Math.round(toNumber(item.weight ?? item.gramsMean ?? item.portion_g)),
        };
      });

      const sumFromIngredients = (key) =>
        normalizedIngredients.reduce((acc, ing) => acc + toNumber(ing[key]), 0);

      const providedCalories = toNumber(raw.totalCalories ?? raw.calories);
      const totalCalories = Math.max(0,
        providedCalories ? Math.round(providedCalories) : Math.round(sumFromIngredients('calories')),
      );

      const providedProtein = toNumber(raw.totalProtein ?? raw.protein);
      const totalProtein = providedProtein
        ? toMacro(providedProtein)
        : toMacro(sumFromIngredients('protein'));

      const providedCarbs = toNumber(raw.totalCarbs ?? raw.carbs);
      const totalCarbs = providedCarbs
        ? toMacro(providedCarbs)
        : toMacro(sumFromIngredients('carbs'));

      const providedFat = toNumber(raw.totalFat ?? raw.fat);
      const totalFat = providedFat
        ? toMacro(providedFat)
        : toMacro(sumFromIngredients('fat'));

      const healthScore = raw.healthScore || raw.healthInsights || null;
      const autoSave = raw.autoSave || raw.savedMeal || null;
      const needsReview = raw.analysisFlags?.needsReview || raw.needsReview || false;
      const isSuspicious = raw.analysisFlags?.isSuspicious || raw.isSuspicious || false;

      return {
        id: raw.id || raw.analysisId || null,
        dishName:
          raw.dishName ||
          raw.name ||
          normalizedIngredients[0]?.name ||
          'Food Analysis',
        imageUri: raw.imageUrl || raw.imageUri || fallbackImage || null,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        ingredients: normalizedIngredients,
        healthScore,
        autoSave,
        needsReview,
        isSuspicious,
        consumedAt: raw.consumedAt || raw.date || raw.createdAt || null,
      };
    },
    [baseImageUri],
  );

  const applyResult = useCallback(
    (payload, imageOverride) => {
      const normalized = normalizeAnalysis(payload, imageOverride);
      if (!normalized) {
        setIsAnalyzing(false);
        return;
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
    [fadeAnim, normalizeAnalysis],
  );

  useEffect(() => {
    if (initialAnalysisParam) {
      const timeoutId = setTimeout(() => {
        applyResult(initialAnalysisParam, baseImageUri);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    // Handle text description analysis
    const description = routeParams.description;
    if (description) {
      setIsAnalyzing(true);
      const runTextAnalysis = async () => {
        try {
          const locale = mapLanguageToLocale(language);
          const analysisResponse = await ApiService.analyzeText(description, locale);
          if (analysisResponse.analysisId) {
            // Poll for results similar to image analysis
            let attempts = 0;
            const maxAttempts = 60;
            const pollForResults = async () => {
              try {
                const status = await ApiService.getAnalysisStatus(analysisResponse.analysisId);
                if (status.status === 'completed') {
                  const result = await ApiService.getAnalysisResult(analysisResponse.analysisId);
                  applyResult(result, null);
                } else if (status.status === 'failed') {
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
          } else {
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
          analysisResponse = await ApiService.analyzeImage(capturedImageUri, locale);
          await clientLog('Analysis:apiCalled', {
            hasAnalysisId: !!analysisResponse?.analysisId,
            hasResult: !!analysisResponse?.items,
          }).catch(() => {});
        } catch (analysisError) {
          console.error('[AnalysisResultsScreen] Analysis API failed:', analysisError);
          await clientLog('Analysis:apiFailed', {
            message: analysisError?.message || String(analysisError),
            status: analysisError?.status,
            timeout: analysisError?.message?.includes('timeout'),
          }).catch(() => {});

          cancelled = true;
          showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
          return;
        }

        if (analysisResponse.analysisId) {
          let attempts = 0;
          const maxAttempts = 60;

          const pollForResults = async () => {
            if (cancelled) return;
            try {
              const status = await ApiService.getAnalysisStatus(analysisResponse.analysisId);

              if (status.status === 'completed') {
                const result = await ApiService.getAnalysisResult(analysisResponse.analysisId);
                await clientLog('Analysis:completed', {
                  hasResult: !!result,
                  dishName: result?.dishName || 'unknown',
                }).catch(() => {});
                finish(result);
              } else if (status.status === 'failed') {
                await clientLog('Analysis:statusFailed').catch(() => {});
                cancelled = true;
                showAnalysisError('analysis.errorTitle', 'analysis.errorMessage');
              } else if (attempts < maxAttempts) {
                attempts += 1;
                setTimeout(() => {
                  if (!cancelled) {
                    pollForResults();
                  }
                }, 1000);
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
  }, [applyResult, baseImageUri, capturedImageUri, initialAnalysisParam, showAnalysisError]);

  const autoSaveInfo = analysisResult?.autoSave || null;
  const hasAutoSave = Boolean(autoSaveInfo?.mealId);
  // Task 5: Use imageUrl from result if available
  const previewImage = analysisResult?.imageUrl || analysisResult?.imageUri || baseImageUri;

  const dishTitle =
    analysisResult?.dishName ||
    analysisResult?.name ||
    t('analysis.title') ||
    'Meal';

  const handleShare = async () => {
    if (!analysisResult) return;
    try {
      await Share.share({
        message: `I just analyzed my meal: ${dishTitle}! ${analysisResult.totalCalories} calories.`,
        title: 'EatSense Analysis',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCorrect = (item, index) => {
    if (!allowEditing) return;
    setEditingItem(item);
    setEditingIndex(index);
  };

  const handleSaveEdit = (updatedItem, index) => {
    const updatedIngredients = [...(analysisResult?.ingredients || [])];
    updatedIngredients[index] = {
      ...updatedItem,
      calories: Math.max(0, Math.round(Number(updatedItem.calories) || 0)),
      protein: Number(updatedItem.protein) || 0,
      carbs: Number(updatedItem.carbs) || 0,
      fat: Number(updatedItem.fat) || 0,
      weight: Number(updatedItem.weight) || 0,
    };

    const newTotalCalories = updatedIngredients.reduce((sum, ing) => sum + (Number(ing.calories) || 0), 0);
    const newTotalProtein = updatedIngredients.reduce((sum, ing) => sum + (Number(ing.protein) || 0), 0);
    const newTotalCarbs = updatedIngredients.reduce((sum, ing) => sum + (Number(ing.carbs) || 0), 0);
    const newTotalFat = updatedIngredients.reduce((sum, ing) => sum + (Number(ing.fat) || 0), 0);

    setAnalysisResult((prev) =>
      prev
        ? {
            ...prev,
            ingredients: updatedIngredients,
            totalCalories: newTotalCalories,
            totalProtein: newTotalProtein,
            totalCarbs: newTotalCarbs,
            totalFat: newTotalFat,
          }
        : prev,
    );
  };

  const handleSave = async () => {
    if (!analysisResult) {
      Alert.alert(t('common.error') || 'Error', t('analysis.noDataToSave') || 'No analysis data to save');
      return;
    }

    try {
      const mealData = {
        name: dishTitle || 'Meal',
        type: 'meal',
        consumedAt: new Date().toISOString(), // Set current date/time for the meal
        imageUri: analysisResult.imageUri || previewImage || null,
        items: (analysisResult.ingredients && Array.isArray(analysisResult.ingredients) ? analysisResult.ingredients : []).map((ingredient) => ({
          name: ingredient.name || 'Unknown',
          calories: Number(ingredient.calories) || 0,
          protein: Number(ingredient.protein) || 0,
          fat: Number(ingredient.fat) || 0,
          carbs: Number(ingredient.carbs) || 0,
          weight: Number(ingredient.weight) || 0,
        })),
        healthScore: analysisResult.healthScore || null,
      };

      if (ApiService && typeof ApiService.createMeal === 'function') {
        await ApiService.createMeal(mealData);
        await clientLog('Analysis:mealSaved', { 
          dishName: mealData.name,
          itemsCount: mealData.items.length,
        }).catch(() => {});
        
        Alert.alert(
          t('analysis.savedTitle') || 'Saved',
          t('analysis.savedMessage') || 'Meal saved to your journal',
          [
            {
              text: t('common.ok') || 'OK',
              onPress: () => {
                // Navigate directly to MainTabs (Dashboard)
                if (navigation && typeof navigation.navigate === 'function') {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs', params: { screen: 'Dashboard' } }],
                  });
                }
              },
            },
          ]
        );
      } else {
        throw new Error('ApiService.createMeal not available');
      }
    } catch (error) {
      console.error('[AnalysisResultsScreen] Save error:', error);
      await clientLog('Analysis:saveError', {
        message: error?.message || String(error),
      }).catch(() => {});
      Alert.alert(
        t('common.error') || 'Error',
        t('analysis.saveError') || 'Failed to save meal. Please try again.'
      );
    }
  };

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

  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              // Navigate directly to MainTabs (Dashboard) instead of going back
              if (navigation && typeof navigation.reset === 'function') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs', params: { screen: 'Dashboard' } }],
                });
              } else if (navigation && typeof navigation.navigate === 'function') {
                navigation.navigate('MainTabs', { screen: 'Dashboard' });
              } else if (navigation && typeof navigation.goBack === 'function') {
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.analyzingRoot}>
          <View style={styles.analyzingContainer}>
            <View style={styles.imageContainer}>
              {renderImage(baseImageUri, styles.analyzingImage, false)}
              <View style={styles.analyzingOverlay}>
                <View style={styles.analyzingContent}>
                  <View style={styles.analyzingIconContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                  <Text
                    style={[
                      styles.analyzingText,
                      { color: colors.inverseText || '#FFFFFF' },
                    ]}
                  >
                    {t('analysis.analyzing')}
                  </Text>
                  <Text
                    style={[
                      styles.analyzingSubtext,
                      { color: colors.inverseText || '#E5E7EB' },
                    ]}
                  >
                    {t('analysis.subtitle')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.progressSteps, { marginTop: tokens.spacing.xl }]}>
              <View style={styles.step}>
                <View style={[styles.stepIcon, styles.stepCompleted]}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </View>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>{t('analysis.uploaded')}</Text>
              </View>

              <View style={styles.step}>
                <View style={[styles.stepIcon, styles.stepActive]}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>{t('analysis.analyzingStep')}</Text>
              </View>

              <View style={styles.step}>
                <View style={[styles.stepIcon, styles.stepPending]}>
                  <Ionicons name="calculator" size={20} color={colors.textSecondary} />
                </View>
                <Text style={[styles.stepText, { color: colors.textSecondary }]}>{t('analysis.calculating')}</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!analysisResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={36} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>{t('common.error')}</Text>
        </View>
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

          {/* Needs Review Banner */}
          {analysisResult?.needsReview && (
            <View>
              <AppCard style={[styles.warningCard, { backgroundColor: colors.warningBackground || '#FFF3CD', borderColor: colors.warning || '#FFC107' }]}>
                <View style={styles.warningHeader}>
                  <Ionicons name="alert-circle" size={22} color={colors.warning || '#FFC107'} />
                  <Text style={[styles.warningTitle, { color: colors.warningText || '#856404' }]}>
                    {t('analysis.needsReviewTitle') || 'Review Required'}
                  </Text>
                </View>
                <Text style={[styles.warningDescription, { color: colors.warningText || '#856404' }]}>
                  {t('analysis.needsReviewMessage') || 'We\'re not fully confident about this analysis. Please double-check and edit the values.'}
                </Text>
              </AppCard>
            </View>
          )}

          {/* Health Score */}
          {analysisResult?.healthScore && (
            <HealthScoreCard healthScore={analysisResult.healthScore} />
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
              <View key={index}>
                <TouchableOpacity
                  style={[styles.ingredientItem, !allowEditing && styles.ingredientItemDisabled]}
                  onPress={allowEditing && typeof handleCorrect === 'function' ? () => handleCorrect(ingredient, index) : () => {}}
                  disabled={!allowEditing}
                  activeOpacity={allowEditing ? 0.7 : 1}
                >
                  <View style={styles.ingredientInfo}>
                    <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>{ingredient.name}</Text>
                    <Text style={[styles.ingredientAmount, { color: colors.textSecondary }]}>{ingredient.weight}g</Text>
                  </View>
                  <View style={styles.ingredientNutrition}>
                    {ingredient.hasNutrition === false ? (
                      <Text style={[styles.ingredientCalories, { color: colors.textTertiary, fontStyle: 'italic' }]}>
                        {t('analysis.noNutritionData')}
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.ingredientCalories, { color: colors.textPrimary }]}>{ingredient.calories} cal</Text>
                        <Text style={[styles.ingredientMacros, { color: colors.textSecondary }]}>
                          P: {formatMacro(ingredient.protein)} • C: {formatMacro(ingredient.carbs)} • F: {formatMacro(ingredient.fat)}
                        </Text>
                      </>
                    )}
                  </View>
                  {allowEditing && (
                    <TouchableOpacity
                      style={styles.editIcon}
                      onPress={() => handleCorrect(ingredient, index)}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            ))}
            </View>
          </View>

          {/* Share Button */}
          <View style={styles.shareContainer}>
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: colors.primary }]} 
              onPress={handleShare}
            >
              <Text style={styles.shareButtonText}>{t('analysis.share')}</Text>
            </TouchableOpacity>
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
    </SafeAreaView>
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
      height: 100,
      borderRadius: tokens.radii.lg,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      padding: tokens.spacing.lg,
      paddingBottom: tokens.spacing.xl,
    },
    dishNameOverlay: {
      color: tokens.colors.inverseText || '#FFFFFF',
      fontSize: tokens.typography.headingM.fontSize,
      fontWeight: tokens.typography.headingM.fontWeight,
      textAlign: 'left',
    },
    analyzingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)',
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
      color: tokens.colors.onSurface,
      fontSize: tokens.typography.subtitle1?.fontSize || tokens.typography.headingS.fontSize,
      fontWeight: '600',
      textAlign: 'center',
    },
    analyzingSubtext: {
      marginTop: 4,
      color: tokens.colors.textSecondary,
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
    shareButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shareButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
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
