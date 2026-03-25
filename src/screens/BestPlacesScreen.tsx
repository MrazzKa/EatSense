import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import AppCard from '../components/common/AppCard';

const SELECTED_CITY_KEY = 'bestPlaces:selectedCity';

// Popular cities for autocomplete suggestions
// Organized by country, covers key markets
// Country names use i18n keys (bestPlaces.countries.*)
const CITIES_DB: { city: string; countryKey: string; emoji: string }[] = [
  // Switzerland
  { city: 'Zürich', countryKey: 'switzerland', emoji: '🇨🇭' },
  { city: 'Geneva', countryKey: 'switzerland', emoji: '🇨🇭' },
  { city: 'Basel', countryKey: 'switzerland', emoji: '🇨🇭' },
  { city: 'Bern', countryKey: 'switzerland', emoji: '🇨🇭' },
  { city: 'Lausanne', countryKey: 'switzerland', emoji: '🇨🇭' },
  { city: 'Lucerne', countryKey: 'switzerland', emoji: '🇨🇭' },
  // Germany
  { city: 'Berlin', countryKey: 'germany', emoji: '🇩🇪' },
  { city: 'Munich', countryKey: 'germany', emoji: '🇩🇪' },
  { city: 'Hamburg', countryKey: 'germany', emoji: '🇩🇪' },
  { city: 'Frankfurt', countryKey: 'germany', emoji: '🇩🇪' },
  { city: 'Cologne', countryKey: 'germany', emoji: '🇩🇪' },
  { city: 'Düsseldorf', countryKey: 'germany', emoji: '🇩🇪' },
  { city: 'Stuttgart', countryKey: 'germany', emoji: '🇩🇪' },
  // France
  { city: 'Paris', countryKey: 'france', emoji: '🇫🇷' },
  { city: 'Lyon', countryKey: 'france', emoji: '🇫🇷' },
  { city: 'Marseille', countryKey: 'france', emoji: '🇫🇷' },
  { city: 'Nice', countryKey: 'france', emoji: '🇫🇷' },
  { city: 'Bordeaux', countryKey: 'france', emoji: '🇫🇷' },
  { city: 'Toulouse', countryKey: 'france', emoji: '🇫🇷' },
  // UK
  { city: 'London', countryKey: 'uk', emoji: '🇬🇧' },
  { city: 'Manchester', countryKey: 'uk', emoji: '🇬🇧' },
  { city: 'Birmingham', countryKey: 'uk', emoji: '🇬🇧' },
  { city: 'Edinburgh', countryKey: 'uk', emoji: '🇬🇧' },
  // USA
  { city: 'New York', countryKey: 'usa', emoji: '🇺🇸' },
  { city: 'Los Angeles', countryKey: 'usa', emoji: '🇺🇸' },
  { city: 'San Francisco', countryKey: 'usa', emoji: '🇺🇸' },
  { city: 'Miami', countryKey: 'usa', emoji: '🇺🇸' },
  { city: 'Chicago', countryKey: 'usa', emoji: '🇺🇸' },
  { city: 'Austin', countryKey: 'usa', emoji: '🇺🇸' },
  // Spain
  { city: 'Madrid', countryKey: 'spain', emoji: '🇪🇸' },
  { city: 'Barcelona', countryKey: 'spain', emoji: '🇪🇸' },
  { city: 'Valencia', countryKey: 'spain', emoji: '🇪🇸' },
  // Italy
  { city: 'Milan', countryKey: 'italy', emoji: '🇮🇹' },
  { city: 'Rome', countryKey: 'italy', emoji: '🇮🇹' },
  { city: 'Florence', countryKey: 'italy', emoji: '🇮🇹' },
  // Netherlands
  { city: 'Amsterdam', countryKey: 'netherlands', emoji: '🇳🇱' },
  { city: 'Rotterdam', countryKey: 'netherlands', emoji: '🇳🇱' },
  // Austria
  { city: 'Vienna', countryKey: 'austria', emoji: '🇦🇹' },
  { city: 'Salzburg', countryKey: 'austria', emoji: '🇦🇹' },
  // CIS
  { city: 'Moscow', countryKey: 'russia', emoji: '🇷🇺' },
  { city: 'Saint Petersburg', countryKey: 'russia', emoji: '🇷🇺' },
  { city: 'Almaty', countryKey: 'kazakhstan', emoji: '🇰🇿' },
  { city: 'Astana', countryKey: 'kazakhstan', emoji: '🇰🇿' },
  { city: 'Dubai', countryKey: 'uae', emoji: '🇦🇪' },
  { city: 'Abu Dhabi', countryKey: 'uae', emoji: '🇦🇪' },
  // Asia
  { city: 'Tokyo', countryKey: 'japan', emoji: '🇯🇵' },
  { city: 'Singapore', countryKey: 'singapore', emoji: '🇸🇬' },
  { city: 'Seoul', countryKey: 'southKorea', emoji: '🇰🇷' },
];

interface SelectedCity {
  city: string;
  countryKey: string;
  emoji: string;
}

export default function BestPlacesScreen() {
  const { colors, tokens } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SELECTED_CITY_KEY).then(raw => {
      if (raw) {
        try { setSelectedCity(JSON.parse(raw)); } catch {}
      }
    }).catch(() => {});
  }, []);

  const getCountryName = useCallback((key: string) => {
    return t(`bestPlaces.countries.${key}`, key);
  }, [t]);

  const filteredCities = useMemo(() => {
    if (!search.trim()) return CITIES_DB;
    const q = search.toLowerCase().trim();
    return CITIES_DB.filter(c =>
      c.city.toLowerCase().includes(q) || getCountryName(c.countryKey).toLowerCase().includes(q)
    );
  }, [search, getCountryName]);

  const handleSelectCity = useCallback(async (city: SelectedCity) => {
    setSelectedCity(city);
    setSearch('');
    setIsFocused(false);
    Keyboard.dismiss();
    await AsyncStorage.setItem(SELECTED_CITY_KEY, JSON.stringify(city));
  }, []);

  const handleClearCity = useCallback(async () => {
    setSelectedCity(null);
    await AsyncStorage.removeItem(SELECTED_CITY_KEY);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('bestPlaces.title') || 'Best Places'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* City Picker */}
      <View style={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('bestPlaces.selectCity') || 'Your city'}
        </Text>

        {/* Selected city chip */}
        {selectedCity && !isFocused && (
          <View style={[styles.selectedChip, { backgroundColor: colors.primary + '15' }]}>
            <Text style={styles.chipEmoji}>{selectedCity.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chipCity, { color: colors.textPrimary }]}>
                {selectedCity.city}
              </Text>
              <Text style={[styles.chipCountry, { color: colors.textSecondary }]}>
                {getCountryName(selectedCity.countryKey)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClearCity} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Search input */}
        <View style={[styles.searchBox, { borderColor: isFocused ? colors.primary : colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('bestPlaces.searchPlaceholder') || 'Search city or country...'}
            placeholderTextColor={colors.textTertiary}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestions dropdown */}
        {isFocused && (
          <View style={[styles.suggestions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FlatList
              data={filteredCities}
              keyExtractor={item => `${item.city}-${item.countryKey}`}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 250 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectCity(item)}
                >
                  <Text style={styles.suggestionEmoji}>{item.emoji}</Text>
                  <View>
                    <Text style={[styles.suggestionCity, { color: colors.textPrimary }]}>
                      {item.city}
                    </Text>
                    <Text style={[styles.suggestionCountry, { color: colors.textTertiary }]}>
                      {getCountryName(item.countryKey)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Text style={[styles.emptySearchText, { color: colors.textTertiary }]}>
                    {t('bestPlaces.noResults') || 'No cities found'}
                  </Text>
                </View>
              }
            />
          </View>
        )}

        {/* Coming Soon section */}
        <AppCard style={styles.comingSoonCard}>
          <View style={styles.comingSoonContent}>
            <Text style={{ fontSize: 48 }}>🍽️</Text>
            <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>
              {t('bestPlaces.comingSoonTitle') || 'Partner Restaurants & Cafes'}
            </Text>
            <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
              {selectedCity
                ? (t('bestPlaces.comingSoonWithCity', { city: selectedCity.city }) || `We're finding the best healthy eating spots in ${selectedCity.city}. Stay tuned!`)
                : (t('bestPlaces.comingSoonGeneric') || 'Select your city to discover partner restaurants, cafes, and health food stores near you.')
              }
            </Text>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={[styles.comingSoonBadgeText, { color: colors.primary }]}>
                {t('common.comingSoon') || 'Coming soon'}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* What to expect */}
        <View style={styles.expectSection}>
          <Text style={[styles.expectTitle, { color: colors.textPrimary }]}>
            {t('bestPlaces.whatToExpect') || 'What to expect'}
          </Text>
          {[
            { icon: 'restaurant-outline' as const, text: t('bestPlaces.feature1') || 'Healthy restaurants and cafes' },
            { icon: 'leaf-outline' as const, text: t('bestPlaces.feature2') || 'Organic & farm-to-table shops' },
            { icon: 'pricetag-outline' as const, text: t('bestPlaces.feature3') || 'Exclusive discounts for EatSense users' },
            { icon: 'star-outline' as const, text: t('bestPlaces.feature4') || 'Community ratings & reviews' },
          ].map((item, i) => (
            <View key={i} style={styles.expectRow}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text style={[styles.expectText, { color: colors.textSecondary }]}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.lg,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    selectedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: tokens.radii.md || 12,
      marginBottom: 12,
      gap: 12,
    },
    chipEmoji: {
      fontSize: 28,
    },
    chipCity: {
      fontSize: 16,
      fontWeight: '600',
    },
    chipCountry: {
      fontSize: 13,
      marginTop: 2,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: tokens.radii.md || 12,
      paddingHorizontal: 12,
      gap: 8,
      height: 44,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      paddingVertical: 0,
    },
    suggestions: {
      borderWidth: 1,
      borderTopWidth: 0,
      borderBottomLeftRadius: tokens.radii.md || 12,
      borderBottomRightRadius: tokens.radii.md || 12,
      overflow: 'hidden',
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    suggestionEmoji: {
      fontSize: 22,
    },
    suggestionCity: {
      fontSize: 15,
      fontWeight: '500',
    },
    suggestionCountry: {
      fontSize: 12,
      marginTop: 1,
    },
    emptySearch: {
      padding: 20,
      alignItems: 'center',
    },
    emptySearchText: {
      fontSize: 14,
    },
    comingSoonCard: {
      marginTop: 24,
    },
    comingSoonContent: {
      alignItems: 'center',
      gap: 12,
    },
    comingSoonTitle: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    comingSoonText: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    comingSoonBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
      marginTop: 4,
    },
    comingSoonBadgeText: {
      fontSize: 14,
      fontWeight: '600',
    },
    expectSection: {
      marginTop: 24,
      gap: 14,
    },
    expectTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    expectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    expectText: {
      fontSize: 14,
      flex: 1,
    },
  });
