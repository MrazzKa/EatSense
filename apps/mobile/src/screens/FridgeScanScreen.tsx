import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import { mapLanguageToLocale } from '../utils/locale';
import { formatCalories } from '../utils/nutritionFormat';
import { useShopping } from '../hooks/useShopping';
import { ShoppingCategory } from '../types/tracker';

type Phase = 'intro' | 'scanning' | 'ingredients' | 'recipesLoading' | 'recipes';

interface FridgeIngredient {
  name: string;
  category?: string;
  quantityHint?: string;
}
interface FridgeRecipe {
  /** Server id — present once the recipe has been saved to history. */
  id?: string;
  title: string;
  usesIngredients: string[];
  alsoNeed: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timeMinutes?: number;
  steps: string[];
  isFavorite?: boolean;
}

async function compress(uri: string): Promise<string> {
  try {
    if ((ImageManipulator as any).ImageManipulator?.manipulate) {
      const ctx = (ImageManipulator as any).ImageManipulator.manipulate(uri);
      ctx.resize({ width: 1024 });
      const ref = await ctx.renderAsync();
      const out = await ref.saveAsync({ compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
      return out.uri;
    }
    if (typeof (ImageManipulator as any).manipulateAsync === 'function') {
      const out = await (ImageManipulator as any).manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      return out.uri;
    }
  } catch {
    /* fall through to original */
  }
  return uri;
}

export default function FridgeScanScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { addItems: addShoppingItems } = useShopping();

  const [phase, setPhase] = useState<Phase>('intro');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<FridgeIngredient[]>([]);
  const [newItem, setNewItem] = useState('');
  const [recipes, setRecipes] = useState<FridgeRecipe[]>([]);
  const [scanId, setScanId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyRecipeId, setBusyRecipeId] = useState<string | null>(null);

  const locale = mapLanguageToLocale(language);

  const runScan = useCallback(async (uri: string) => {
    setPhotoUri(uri);
    setPhase('scanning');
    try {
      const compressed = await compress(uri);
      const res = await ApiService.scanFridge(compressed, locale);
      const found: FridgeIngredient[] = Array.isArray(res?.ingredients) ? res.ingredients : [];
      setIngredients(found);
      setScanId(res?.scanId || null);
      setPhase('ingredients');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      const limitHit = err?.status === 429 || err?.status === 403;
      Alert.alert(
        t('fridge.errorTitle') || 'Could not scan',
        limitHit ? (t('fridge.limitReached') || 'Daily limit reached.') : (t('fridge.errorBody') || 'Please try again.'),
      );
      setPhase('intro');
    }
  }, [locale, t]);

  const takePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('fridge.cameraPermTitle') || 'Camera access needed', t('fridge.cameraPermBody') || 'Enable camera access in settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false, exif: false });
    if (result.canceled || !result.assets?.[0]) return;
    runScan(result.assets[0].uri);
  }, [runScan, t]);

  const chooseFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('fridge.galleryPermTitle') || 'Gallery access needed', t('fridge.galleryPermBody') || 'Enable photo access in settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, selectionLimit: 1, exif: false });
    if (result.canceled || !result.assets?.[0]) return;
    runScan(result.assets[0].uri);
  }, [runScan, t]);

  const removeIngredient = useCallback((idx: number) => {
    Haptics.selectionAsync().catch(() => {});
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addIngredient = useCallback(() => {
    const name = newItem.trim();
    if (!name) return;
    setIngredients((prev) => [...prev, { name }]);
    setNewItem('');
    Haptics.selectionAsync().catch(() => {});
  }, [newItem]);

  const getRecipes = useCallback(async () => {
    if (ingredients.length === 0) return;
    setPhase('recipesLoading');
    try {
      // Passing scanId links these recipes to the history entry and lets the
      // server record how the user edited the detected chips.
      const res = await ApiService.getFridgeRecipes(
        ingredients.map((i) => i.name),
        locale,
        scanId ? { scanId } : undefined,
      );
      setRecipes(Array.isArray(res?.recipes) ? res.recipes : []);
      setPhase('recipes');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      const limitHit = err?.status === 429 || err?.status === 403;
      Alert.alert(
        t('fridge.errorTitle') || 'Could not load recipes',
        limitHit ? (t('fridge.limitReached') || 'Daily limit reached.') : (t('fridge.errorBody') || 'Please try again.'),
      );
      setPhase('ingredients');
    }
  }, [ingredients, locale, scanId, t]);

  /** Ask for a different set without spending another scan. */
  const loadMoreRecipes = useCallback(async () => {
    if (ingredients.length === 0 || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await ApiService.getFridgeRecipes(
        ingredients.map((i) => i.name),
        locale,
        { scanId: scanId || undefined, excludeTitles: recipes.map((r) => r.title) },
      );
      const more: FridgeRecipe[] = Array.isArray(res?.recipes) ? res.recipes : [];
      if (more.length === 0) {
        Alert.alert(t('fridge.noMoreTitle') || 'That’s all for now', t('fridge.noMoreBody') || 'Try adding a few more ingredients.');
      } else {
        setRecipes((prev) => [...prev, ...more]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err: any) {
      const limitHit = err?.status === 429 || err?.status === 403;
      Alert.alert(
        t('fridge.errorTitle') || 'Could not load recipes',
        limitHit ? (t('fridge.limitReached') || 'Daily limit reached.') : (t('fridge.errorBody') || 'Please try again.'),
      );
    } finally {
      setLoadingMore(false);
    }
  }, [ingredients, locale, scanId, recipes, loadingMore, t]);

  const toggleFavorite = useCallback(async (recipe: FridgeRecipe) => {
    if (!recipe.id) return;
    Haptics.selectionAsync().catch(() => {});
    // Optimistic — the heart must feel instant.
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: !r.isFavorite } : r)));
    try {
      const res = await ApiService.toggleFridgeFavorite(recipe.id);
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: !!res?.isFavorite } : r)));
      if (res?.limitReached) {
        Alert.alert(
          t('fridge.favLimitTitle') || 'Favourites are full',
          t('fridge.favLimitBody') || 'Upgrade to Pro to save unlimited recipes.',
        );
      }
    } catch {
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: recipe.isFavorite } : r)));
    }
  }, [t]);

  /** "I cooked this" → log it to the diary. */
  const cookRecipe = useCallback(async (recipe: FridgeRecipe) => {
    if (!recipe.id || busyRecipeId) return;
    setBusyRecipeId(recipe.id);
    try {
      await ApiService.cookFridgeRecipe(recipe.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        t('fridge.cookedTitle') || 'Added to your diary',
        (t('fridge.cookedBody') || '{{title}} was logged as a meal.').replace('{{title}}', recipe.title),
      );
    } catch {
      Alert.alert(t('fridge.errorTitle') || 'Something went wrong', t('fridge.errorBody') || 'Please try again.');
    } finally {
      setBusyRecipeId(null);
    }
  }, [busyRecipeId, t]);

  /** Push the "you'll also need" staples into the shopping list. */
  const addMissingToShopping = useCallback(async (recipe: FridgeRecipe) => {
    const missing = (recipe.alsoNeed || []).map((n) => String(n).trim()).filter(Boolean);
    if (missing.length === 0) return;
    Haptics.selectionAsync().catch(() => {});
    try {
      await addShoppingItems(missing.map((name) => ({ name, category: 'other' as ShoppingCategory })));
      Alert.alert(
        t('fridge.addedToListTitle') || 'Added to shopping list',
        (t('fridge.addedToListBody') || '{{count}} items added.').replace('{{count}}', String(missing.length)),
      );
    } catch {
      Alert.alert(t('fridge.errorTitle') || 'Something went wrong', t('fridge.errorBody') || 'Please try again.');
    }
  }, [addShoppingItems, t]);

  const reset = useCallback(() => {
    setPhotoUri(null);
    setIngredients([]);
    setRecipes([]);
    setScanId(null);
    setPhase('intro');
  }, []);

  // ── Header ────────────────────────────────────────────────────────────────
  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('fridge.title') || 'What can I cook?'}</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('FridgeHistory')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel={t('fridge.history') || 'History'}
      >
        <Ionicons name="time-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  // ── Intro (instructions) ────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {Header}
        <ScrollView contentContainerStyle={styles.introScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroIcon}>
            <Ionicons name="fast-food-outline" size={44} color={colors.primary} />
          </View>
          <Text style={styles.introTitle}>{t('fridge.introTitle') || 'Snap your fridge'}</Text>
          <Text style={styles.introSubtitle}>
            {t('fridge.introSubtitle') || 'Take a photo of what you have and we’ll suggest what you can cook right now.'}
          </Text>

          <View style={styles.tips}>
            {[
              { icon: 'bulb-outline', text: t('fridge.tip1') || 'Open the fridge door and keep products visible' },
              { icon: 'sunny-outline', text: t('fridge.tip2') || 'Good lighting helps recognition' },
              { icon: 'create-outline', text: t('fridge.tip3') || 'You can edit the detected list before getting recipes' },
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name={tip.icon as any} size={20} color={colors.primary} style={{ marginRight: 12 }} />
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto} activeOpacity={0.85}>
            <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>{t('fridge.takePhoto') || 'Take photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={chooseFromGallery} activeOpacity={0.85}>
            <Ionicons name="images-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.secondaryBtnText}>{t('fridge.chooseGallery') || 'Choose from gallery'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading (scan or recipes) ─────────────────────────────────────────────
  if (phase === 'scanning' || phase === 'recipesLoading') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {Header}
        <View style={styles.loadingBox}>
          {photoUri && phase === 'scanning' ? (
            <Image source={{ uri: photoUri }} style={styles.loadingImage} resizeMode="cover" />
          ) : null}
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
          <Text style={styles.loadingText}>
            {phase === 'scanning'
              ? (t('fridge.scanning') || 'Recognizing your products…')
              : (t('fridge.cookingUp') || 'Finding recipes you can make…')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Detected ingredients (editable) ───────────────────────────────────────
  if (phase === 'ingredients') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {Header}
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t('fridge.detectedTitle') || 'We found these'}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('fridge.detectedSubtitle') || 'Tap to remove anything wrong, or add what we missed.'}
          </Text>

          {ingredients.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="scan-outline" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>{t('fridge.noIngredients') || 'Nothing detected. Add items manually below.'}</Text>
            </View>
          ) : (
            <View style={styles.chips}>
              {ingredients.map((ing, idx) => (
                <TouchableOpacity key={`${ing.name}-${idx}`} style={styles.chip} onPress={() => removeIngredient(idx)} activeOpacity={0.7}>
                  <Text style={styles.chipText}>
                    {ing.name}
                    {ing.quantityHint ? ` · ${ing.quantityHint}` : ''}
                  </Text>
                  <Ionicons name="close" size={16} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newItem}
              onChangeText={setNewItem}
              placeholder={t('fridge.addPlaceholder') || 'Add an ingredient…'}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
              onSubmitEditing={addIngredient}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addIngredient} activeOpacity={0.8}>
              <Ionicons name="add" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, ingredients.length === 0 && styles.primaryBtnDisabled]}
            onPress={getRecipes}
            disabled={ingredients.length === 0}
            activeOpacity={0.85}
          >
            <Ionicons name="restaurant" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>{t('fridge.whatCanICook') || 'What can I cook?'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.textBtn} onPress={reset} activeOpacity={0.7}>
            <Text style={styles.textBtnText}>{t('fridge.rescan') || 'Retake photo'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Recipes ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {Header}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t('fridge.recipesTitle') || 'Recipes for you'}</Text>

        {recipes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="sad-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t('fridge.emptyRecipes') || 'No recipes found. Try adding a few more ingredients.'}</Text>
          </View>
        ) : (
          recipes.map((r, i) => (
            <View key={r.id || i} style={styles.recipeCard}>
              <View style={styles.recipeTitleRow}>
                <Text style={[styles.recipeTitle, { flex: 1 }]}>{r.title}</Text>
                {r.id ? (
                  <TouchableOpacity
                    onPress={() => toggleFavorite(r)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel={t('fridge.favorite') || 'Save recipe'}
                  >
                    <Ionicons
                      name={r.isFavorite ? 'heart' : 'heart-outline'}
                      size={22}
                      color={r.isFavorite ? '#FF6B6B' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.recipeMetaRow}>
                <Text style={styles.recipeMeta}>{formatCalories(r.calories)}</Text>
                <Text style={styles.recipeMetaDot}>·</Text>
                <Text style={styles.recipeMeta}>{t('analysis.proteinShort') || 'P'} {r.protein}g</Text>
                <Text style={styles.recipeMetaDot}>·</Text>
                <Text style={styles.recipeMeta}>{t('analysis.carbsShort') || 'C'} {r.carbs}g</Text>
                <Text style={styles.recipeMetaDot}>·</Text>
                <Text style={styles.recipeMeta}>{t('analysis.fatShort') || 'F'} {r.fat}g</Text>
                {r.timeMinutes ? (
                  <>
                    <Text style={styles.recipeMetaDot}>·</Text>
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.recipeMeta}> {r.timeMinutes} {t('fridge.minutes') || 'min'}</Text>
                  </>
                ) : null}
              </View>

              {r.usesIngredients?.length ? (
                <Text style={styles.recipeUses}>
                  <Text style={styles.recipeLabel}>{t('fridge.uses') || 'Uses'}: </Text>
                  {r.usesIngredients.join(', ')}
                </Text>
              ) : null}
              {r.alsoNeed?.length ? (
                <View>
                  <Text style={styles.recipeAlsoNeed}>
                    <Text style={styles.recipeLabel}>{t('fridge.alsoNeed') || 'You’ll also need'}: </Text>
                    {r.alsoNeed.join(', ')}
                  </Text>
                  <TouchableOpacity style={styles.inlineAction} onPress={() => addMissingToShopping(r)} activeOpacity={0.7}>
                    <Ionicons name="cart-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.inlineActionText}>{t('fridge.addMissing') || 'Add to shopping list'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {r.steps?.length ? (
                <View style={styles.steps}>
                  {r.steps.map((s, si) => (
                    <View key={si} style={styles.stepRow}>
                      <Text style={styles.stepNum}>{si + 1}</Text>
                      <Text style={styles.stepText}>{s}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {r.id ? (
                <TouchableOpacity
                  style={[styles.cookBtn, busyRecipeId === r.id && styles.primaryBtnDisabled]}
                  onPress={() => cookRecipe(r)}
                  disabled={busyRecipeId === r.id}
                  activeOpacity={0.85}
                >
                  {busyRecipeId === r.id ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.cookBtnText}>{t('fridge.iCookedThis') || 'I cooked this'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}

        {recipes.length > 0 ? (
          <TouchableOpacity
            style={[styles.moreBtn, loadingMore && styles.primaryBtnDisabled]}
            onPress={loadMoreRecipes}
            disabled={loadingMore}
            activeOpacity={0.8}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.secondaryBtnText}>{t('fridge.moreRecipes') || 'Show more recipes'}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('ingredients')} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.secondaryBtnText}>{t('fridge.editIngredients') || 'Edit ingredients'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.textBtn} onPress={reset} activeOpacity={0.7}>
          <Text style={styles.textBtnText}>{t('fridge.rescan') || 'Retake photo'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    introScroll: { paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },
    heroIcon: {
      width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surfaceSecondary,
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    introTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
    introSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 21 },
    tips: { alignSelf: 'stretch', marginTop: 28, gap: 14 },
    tipRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.borderMuted,
    },
    tipText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
    footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 10 },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surfaceSecondary, borderRadius: 14, paddingVertical: 15,
    },
    secondaryBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
    textBtn: { alignItems: 'center', paddingVertical: 8 },
    textBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    loadingImage: { width: 180, height: 180, borderRadius: 20 },
    loadingText: { marginTop: 16, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
    body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    sectionSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 18, lineHeight: 20 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
      borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    },
    chipText: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
    addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 10 },
    addInput: {
      flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary,
    },
    addBtn: {
      width: 46, height: 46, borderRadius: 12, backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    emptyBox: { alignItems: 'center', paddingVertical: 36 },
    emptyText: { marginTop: 12, fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },
    recipeCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14,
      borderWidth: 1, borderColor: colors.borderMuted,
    },
    recipeTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    recipeTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
    recipeMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8, gap: 2 },
    recipeMeta: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    recipeMetaDot: { fontSize: 13, color: colors.textTertiary, marginHorizontal: 4 },
    recipeUses: { fontSize: 13.5, color: colors.textPrimary, marginTop: 12, lineHeight: 19 },
    recipeAlsoNeed: { fontSize: 13.5, color: colors.textSecondary, marginTop: 6, lineHeight: 19 },
    recipeLabel: { fontWeight: '700', color: colors.textPrimary },
    steps: { marginTop: 14, gap: 10 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
    stepNum: {
      width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceSecondary,
      color: colors.primary, fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 22, marginRight: 10,
      overflow: 'hidden',
    },
    stepText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
    inlineAction: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-start' },
    inlineActionText: { fontSize: 13.5, color: colors.primary, fontWeight: '700' },
    cookBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, marginTop: 16,
    },
    cookBtnText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
    moreBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 14, paddingVertical: 14, marginBottom: 8,
      borderWidth: 1, borderColor: colors.primary,
    },
  });
