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

type Phase = 'intro' | 'scanning' | 'ingredients' | 'recipesLoading' | 'recipes';

interface FridgeIngredient {
  name: string;
  category?: string;
  quantityHint?: string;
}
interface FridgeRecipe {
  title: string;
  usesIngredients: string[];
  alsoNeed: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timeMinutes?: number;
  steps: string[];
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

  const [phase, setPhase] = useState<Phase>('intro');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<FridgeIngredient[]>([]);
  const [newItem, setNewItem] = useState('');
  const [recipes, setRecipes] = useState<FridgeRecipe[]>([]);

  const locale = mapLanguageToLocale(language);

  const runScan = useCallback(async (uri: string) => {
    setPhotoUri(uri);
    setPhase('scanning');
    try {
      const compressed = await compress(uri);
      const res = await ApiService.scanFridge(compressed, locale);
      const found: FridgeIngredient[] = Array.isArray(res?.ingredients) ? res.ingredients : [];
      setIngredients(found);
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
      const res = await ApiService.getFridgeRecipes(ingredients.map((i) => i.name), locale);
      setRecipes(Array.isArray(res?.recipes) ? res.recipes : []);
      setPhase('recipes');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Alert.alert(t('fridge.errorTitle') || 'Could not load recipes', t('fridge.errorBody') || 'Please try again.');
      setPhase('ingredients');
    }
  }, [ingredients, locale, t]);

  const reset = useCallback(() => {
    setPhotoUri(null);
    setIngredients([]);
    setRecipes([]);
    setPhase('intro');
  }, []);

  // ── Header ────────────────────────────────────────────────────────────────
  const Header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('fridge.title') || 'What can I cook?'}</Text>
      <View style={{ width: 24 }} />
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
            <View key={i} style={styles.recipeCard}>
              <Text style={styles.recipeTitle}>{r.title}</Text>
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
                <Text style={styles.recipeAlsoNeed}>
                  <Text style={styles.recipeLabel}>{t('fridge.alsoNeed') || 'You’ll also need'}: </Text>
                  {r.alsoNeed.join(', ')}
                </Text>
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
            </View>
          ))
        )}
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
  });
