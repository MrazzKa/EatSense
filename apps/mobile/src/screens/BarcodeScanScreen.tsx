import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ApiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

/**
 * Logging a packaged product by scanning its barcode.
 *
 * This is a lookup, not an analysis: the barcode names the product exactly, so
 * there is nothing to estimate and nothing to spend an analysis credit on. What
 * the label cannot tell us is how much of it was eaten, which is the one thing
 * the screen asks for.
 *
 * A product the database knows but has no label for is not treated as a failure.
 * Open Food Facts is filled in by volunteers and plenty of Swiss own-brand items
 * are still bare entries; those get editable fields instead of a dead end.
 */

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const;
type MealType = (typeof MEAL_TYPES)[number];

const SUPPORTED_SYMBOLOGIES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/** Per-100 g figures, which is how every label and our API state them. */
interface Facts {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Product {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  servingG: number | null;
  per100g: Partial<Facts> & { fiber?: number; sugars?: number; satFat?: number; sodium?: number };
  hasNutrition: boolean;
  allergens: string[];
  additives: string[];
  nutriScore: string | null;
  novaGroup: number | null;
}

type Outcome =
  | { status: 'found'; product: Product }
  | { status: 'no_nutrition'; product: Product }
  | { status: 'not_found'; barcode: string };

type Phase = 'scanning' | 'looking' | 'result';

/** Breakfast at 3pm is almost always the wrong guess; the clock is a better one. */
export function mealTypeForNow(hour = new Date().getHours()): MealType {
  if (hour < 11) return 'BREAKFAST';
  if (hour < 16) return 'LUNCH';
  if (hour < 21) return 'DINNER';
  return 'SNACK';
}

const toNumber = (value: string): number => {
  // Commas: a German or French keyboard offers one where the label prints a dot.
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

/** Scales per-100 g figures to the portion actually eaten. */
export function scaleFacts(facts: Facts, grams: number): Facts {
  const factor = grams / 100;
  return {
    calories: Math.round(facts.calories * factor),
    protein: Math.round(facts.protein * factor * 10) / 10,
    carbs: Math.round(facts.carbs * factor * 10) / 10,
    fat: Math.round(facts.fat * factor * 10) / 10,
  };
}

export default function BarcodeScanScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [grams, setGrams] = useState('100');
  const [mealType, setMealType] = useState<MealType>(mealTypeForNow);
  const [facts, setFacts] = useState<Facts>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [saving, setSaving] = useState(false);

  // The camera fires this many times a second while the code is in frame. Without
  // a latch, one scan becomes a dozen requests.
  const handling = useRef(false);

  const restart = useCallback(() => {
    handling.current = false;
    setOutcome(null);
    setPhase('scanning');
  }, []);

  const handleScan = useCallback(
    async (event: any) => {
      if (handling.current) return;
      const code = String(event?.data ?? '').trim();
      if (!code) return;

      handling.current = true;
      setPhase('looking');
      Haptics.selectionAsync().catch(() => {});

      try {
        const result = (await ApiService.lookupBarcode(code, language)) as Outcome;
        setOutcome(result);
        if (result.status !== 'not_found') {
          const { product } = result;
          setGrams(String(product.servingG || 100));
          setFacts({
            calories: product.per100g?.calories ?? 0,
            protein: product.per100g?.protein ?? 0,
            carbs: product.per100g?.carbs ?? 0,
            fat: product.per100g?.fat ?? 0,
          });
        }
        setPhase('result');
      } catch (error: any) {
        // A 400 is a misread, not a missing product — the check digit did not
        // match. Going straight back to the camera is the right answer.
        Alert.alert(
          t('common.error', 'Error'),
          error?.message || t('barcode.lookupFailed', 'Could not read that code. Try again.'),
        );
        restart();
      }
    },
    [language, t, restart],
  );

  const portion = useMemo(() => scaleFacts(facts, toNumber(grams)), [facts, grams]);

  const addToDiary = useCallback(async () => {
    if (saving || !outcome || outcome.status === 'not_found') return;
    const weight = toNumber(grams);
    if (weight <= 0) {
      Alert.alert(t('barcode.portionTitle', 'How much?'), t('barcode.portionInvalid', 'Enter a weight in grams.'));
      return;
    }
    if (portion.calories <= 0 && portion.protein <= 0 && portion.carbs <= 0 && portion.fat <= 0) {
      Alert.alert(
        t('barcode.factsTitle', 'Nutrition facts'),
        t('barcode.factsMissing', 'Fill in at least the calories before saving.'),
      );
      return;
    }

    setSaving(true);
    try {
      const { product } = outcome;
      const name = product.brand ? `${product.name} · ${product.brand}` : product.name;
      await ApiService.createMeal({
        name,
        type: mealType,
        consumedAt: new Date().toISOString(),
        imageUri: product.imageUrl || undefined,
        items: [{ name, weight, ...portion }],
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        t('common.error', 'Error'),
        error?.message || t('barcode.saveFailed', 'Could not save. Check your connection and try again.'),
      );
    } finally {
      setSaving(false);
    }
  }, [saving, outcome, grams, portion, mealType, navigation, t]);

  // ------------------------------------------------------------------ views ---

  const renderCamera = () => {
    if (!permission) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.permissionText}>
            {t('barcode.permission', 'Allow camera access to scan a barcode.')}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => requestPermission().catch(() => {})}
            accessibilityRole="button"
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t('common.allow', 'Allow')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: [...SUPPORTED_SYMBOLOGIES] }}
          onBarcodeScanned={handleScan}
        />
        <View pointerEvents="none" style={styles.frame} />
        <Text style={styles.cameraHint}>
          {t('barcode.hint', 'Point the camera at the barcode on the package.')}
        </Text>
      </View>
    );
  };

  const renderNotFound = (barcode: string) => (
    <View style={styles.center}>
      <Ionicons name="help-circle-outline" size={44} color={colors.textTertiary} />
      <Text style={styles.resultTitle}>{t('barcode.notFoundTitle', 'Not in the database')}</Text>
      <Text style={styles.resultBody}>
        {t(
          'barcode.notFoundBody',
          'Nobody has added this product yet. You can photograph the food instead — that works for anything.',
        )}
      </Text>
      <Text style={styles.code}>{barcode}</Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.replace('Camera')}
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>{t('barcode.photoInstead', 'Photograph it instead')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={restart} accessibilityRole="button">
        <Text style={styles.secondaryBtnText}>{t('barcode.scanAgain', 'Scan another')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFactRow = (label: string, value: number, unit: string) => (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{`${value} ${unit}`}</Text>
    </View>
  );

  const renderFactInput = (label: string, key: keyof Facts) => (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <TextInput
        style={styles.factInput}
        value={String(facts[key] || '')}
        onChangeText={(text) => setFacts((prev) => ({ ...prev, [key]: toNumber(text) }))}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={label}
      />
    </View>
  );

  const renderProduct = (product: Product, editable: boolean) => (
    <ScrollView contentContainerStyle={styles.resultBody_} keyboardShouldPersistTaps="handled">
      <View style={styles.productHeader}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.thumb} resizeMode="contain" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Ionicons name="cube-outline" size={26} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.productMeta}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.brand ? <Text style={styles.productBrand}>{product.brand}</Text> : null}
          {product.quantity ? <Text style={styles.productQuantity}>{product.quantity}</Text> : null}
        </View>
      </View>

      {product.nutriScore || product.novaGroup ? (
        <View style={styles.chips}>
          {product.nutriScore ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {t('barcode.nutriScore', 'Nutri-Score {{grade}}').replace(
                  '{{grade}}',
                  product.nutriScore,
                )}
              </Text>
            </View>
          ) : null}
          {product.novaGroup ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {t('barcode.nova', 'NOVA {{group}}').replace('{{group}}', String(product.novaGroup))}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {editable ? (
        <Text style={styles.notice}>
          {t(
            'barcode.noNutritionBody',
            'This product is known, but its label has not been filled in. Type what it says and it will be saved with your entry.',
          )}
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('barcode.per100', 'Per 100 g')}</Text>
        {editable ? (
          <>
            {renderFactInput(t('analysis.calories', 'Calories'), 'calories')}
            {renderFactInput(t('dashboard.protein', 'Protein'), 'protein')}
            {renderFactInput(t('dashboard.carbs', 'Carbs'), 'carbs')}
            {renderFactInput(t('dashboard.fat', 'Fat'), 'fat')}
          </>
        ) : (
          <>
            {renderFactRow(t('analysis.calories', 'Calories'), Math.round(facts.calories), 'kcal')}
            {renderFactRow(t('dashboard.protein', 'Protein'), facts.protein, t('dashboard.gramShort', 'g'))}
            {renderFactRow(t('dashboard.carbs', 'Carbs'), facts.carbs, t('dashboard.gramShort', 'g'))}
            {renderFactRow(t('dashboard.fat', 'Fat'), facts.fat, t('dashboard.gramShort', 'g'))}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('barcode.portionTitle', 'How much?')}</Text>
        <View style={styles.portionRow}>
          <TextInput
            style={styles.portionInput}
            value={grams}
            onChangeText={setGrams}
            keyboardType="numeric"
            accessibilityLabel={t('barcode.portionTitle', 'How much?')}
          />
          <Text style={styles.portionUnit}>{t('dashboard.gramShort', 'g')}</Text>
          {product.servingG ? (
            <TouchableOpacity
              style={styles.servingBtn}
              onPress={() => setGrams(String(product.servingG))}
              accessibilityRole="button"
            >
              <Text style={styles.servingBtnText}>
                {t('barcode.oneServing', '1 serving ({{grams}} g)').replace(
                  '{{grams}}',
                  String(product.servingG),
                )}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.totals}>
          <Text style={styles.totalsMain}>{`${portion.calories} kcal`}</Text>
          <Text style={styles.totalsRest}>
            {`${t('analysis.proteinShort', 'P')} ${portion.protein} · ` +
              `${t('analysis.carbsShort', 'C')} ${portion.carbs} · ` +
              `${t('barcode.fatShort', 'F')} ${portion.fat}`}
          </Text>
        </View>
      </View>

      <View style={styles.segment}>
        {MEAL_TYPES.map((candidate) => (
          <TouchableOpacity
            key={candidate}
            style={[styles.segmentTab, mealType === candidate && styles.segmentTabActive]}
            onPress={() => setMealType(candidate)}
            accessibilityRole="button"
            accessibilityState={{ selected: mealType === candidate }}
          >
            <Text style={[styles.segmentText, mealType === candidate && styles.segmentTextActive]}>
              {t(`dashboard.mealTypes.${candidate.toLowerCase()}`, candidate)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {product.allergens.length > 0 ? (
        <View style={styles.tagBlock}>
          <Text style={styles.tagBlockLabel}>{t('barcode.allergens', 'Allergens on the label')}</Text>
          <Text style={styles.tagBlockText}>{product.allergens.join(', ')}</Text>
        </View>
      ) : null}

      {product.additives.length > 0 ? (
        <View style={styles.tagBlock}>
          <Text style={styles.tagBlockLabel}>{t('barcode.additives', 'Additives')}</Text>
          <Text style={styles.tagBlockText}>{product.additives.join(', ').toUpperCase()}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
        onPress={addToDiary}
        disabled={saving}
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.primaryBtnText}>{t('barcode.addToDiary', 'Add to diary')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={restart} accessibilityRole="button">
        <Text style={styles.secondaryBtnText}>{t('barcode.scanAgain', 'Scan another')}</Text>
      </TouchableOpacity>

      <Text style={styles.source}>
        {t('barcode.source', 'Label data from Open Food Facts, contributed by volunteers.')}
      </Text>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('barcode.title', 'Scan a product')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {phase === 'scanning' && renderCamera()}
        {phase === 'looking' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.resultBody}>{t('barcode.looking', 'Looking up the product…')}</Text>
          </View>
        )}
        {phase === 'result' && outcome?.status === 'not_found' && renderNotFound(outcome.barcode)}
        {phase === 'result' && outcome?.status === 'found' && renderProduct(outcome.product, false)}
        {phase === 'result' &&
          outcome?.status === 'no_nutrition' &&
          renderProduct(outcome.product, true)}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },

    cameraWrap: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    frame: {
      width: '76%',
      height: 150,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: 14,
      opacity: 0.85,
    },
    cameraHint: {
      position: 'absolute',
      bottom: 40,
      paddingHorizontal: 32,
      color: '#FFFFFF',
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
    permissionText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    resultTitle: { fontSize: 19, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    resultBody: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    code: { fontSize: 13, color: colors.textTertiary, letterSpacing: 1 },

    resultBody_: { paddingHorizontal: 20, paddingBottom: 36 },
    productHeader: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 14 },
    thumb: { width: 68, height: 68, borderRadius: 12, backgroundColor: colors.surfaceMuted },
    thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
    productMeta: { flex: 1, gap: 2 },
    productName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
    productBrand: { fontSize: 14, color: colors.textSecondary },
    productQuantity: { fontSize: 13, color: colors.textTertiary },

    chips: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    chip: {
      paddingVertical: 5,
      paddingHorizontal: 11,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
    },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

    notice: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderMuted,
      marginBottom: 14,
    },
    cardLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    factRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 7,
    },
    factLabel: { fontSize: 15, color: colors.textSecondary },
    factValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    factInput: {
      minWidth: 88,
      textAlign: 'right',
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 4,
    },

    portionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    portionInput: {
      width: 86,
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 4,
    },
    portionUnit: { fontSize: 16, color: colors.textSecondary },
    servingBtn: {
      marginLeft: 'auto',
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
    },
    servingBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    totals: { marginTop: 14, gap: 2 },
    totalsMain: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    totalsRest: { fontSize: 13, color: colors.textSecondary },

    segment: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      padding: 3,
      marginBottom: 14,
    },
    segmentTab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
    segmentTabActive: { backgroundColor: colors.surface },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
    segmentTextActive: { color: colors.textPrimary },

    tagBlock: { marginBottom: 14 },
    tagBlockLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    tagBlockText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      alignSelf: 'stretch',
    },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },
    secondaryBtn: { paddingVertical: 14, alignItems: 'center' },
    secondaryBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },

    source: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', lineHeight: 16 },
  });
