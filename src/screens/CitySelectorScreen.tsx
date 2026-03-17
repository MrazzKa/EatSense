// @ts-nocheck
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useI18n } from '../../app/i18n/hooks';
import { useTheme, useDesignTokens } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/apiService';

export default function CitySelectorScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useDesignTokens();
  const { t } = useI18n();
  const { refreshUser } = useAuth();

  const [countries, setCountries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const data = await ApiService.getCountryCommunityGroups();
        setCountries(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        console.warn('Failed to load country groups:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCountries();
  }, []);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const query = searchQuery.toLowerCase();
    return countries.filter((c: any) => c.name?.toLowerCase().includes(query));
  }, [countries, searchQuery]);

  const selectCountry = useCallback(
    async (countryGroupId: string) => {
      setSelecting(countryGroupId);
      try {
        await ApiService.setMyCity(countryGroupId);
        await refreshUser();
        navigation.goBack();
      } catch (err) {
        console.warn('Failed to set country:', err);
        Alert.alert(t('community.error', 'Error'), t('community.setCountryFailed', 'Failed to set your country'));
      } finally {
        setSelecting(null);
      }
    },
    [navigation, refreshUser, t],
  );

  const handleDetectLocation = useCallback(async () => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('community.locationDenied', 'Location Access'),
          t('community.locationDeniedDesc', 'Please enable location access in Settings to detect your country.'),
        );
        setDetecting(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const isoCountryCode = reverseGeocode[0].isoCountryCode;
        if (isoCountryCode) {
          const match = countries.find(
            (c: any) => c.country?.toUpperCase() === isoCountryCode.toUpperCase(),
          );
          if (match) {
            await selectCountry(match.id);
          } else {
            Alert.alert(
              t('community.countryNotFound', 'Country Not Found'),
              t('community.countryNotFoundDesc', 'Your country is not available yet. Please select manually.'),
            );
          }
        }
      }
    } catch (err) {
      console.warn('Location detection failed:', err);
      Alert.alert(
        t('community.locationError', 'Error'),
        t('community.locationErrorDesc', 'Could not detect your location. Please select manually.'),
      );
    } finally {
      setDetecting(false);
    }
  }, [countries, selectCountry, t]);

  const renderCountryItem = useCallback(
    ({ item }: any) => (
      <TouchableOpacity
        style={[styles.cityItem, { borderBottomColor: colors.border }]}
        onPress={() => selectCountry(item.id)}
        disabled={selecting === item.id}
        activeOpacity={0.6}
      >
        <Ionicons name="flag" size={20} color={colors.primary} />
        <View style={styles.cityInfo}>
          <Text style={[styles.cityName, { color: colors.textPrimary || colors.text }]}>{item.name}</Text>
          <Text style={[styles.cityMembers, { color: colors.textTertiary }]}>
            {item._count?.memberships || 0} {t('community.members', 'members')}
          </Text>
        </View>
        {selecting === item.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        )}
      </TouchableOpacity>
    ),
    [colors, selecting, selectCountry, t, styles],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('community.selectCountry', 'Select Your Country')}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Detect location button */}
      <TouchableOpacity
        style={[styles.detectBtn, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
        onPress={handleDetectLocation}
        disabled={detecting}
        activeOpacity={0.7}
      >
        {detecting ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="navigate-outline" size={20} color={colors.primary} />
        )}
        <Text style={[styles.detectBtnText, { color: colors.primary }]}>
          {detecting
            ? t('community.detecting', 'Detecting location...')
            : t('community.detectLocation', 'Detect my location')}
        </Text>
      </TouchableOpacity>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSecondary || colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary || colors.text }]}
          placeholder={t('community.searchCountry', 'Search countries...')}
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Country list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => item.id}
          renderItem={renderCountryItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {searchQuery
                  ? t('community.noCountriesFound', 'No countries match your search')
                  : t('community.noCountries', 'No countries available')}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (tokens: any, colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
    },
    detectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 12,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    detectBtnText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      marginLeft: 8,
      paddingVertical: 0,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingBottom: 40,
    },
    cityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cityInfo: {
      flex: 1,
      marginLeft: 12,
    },
    cityName: {
      fontSize: 16,
      fontWeight: '500',
    },
    cityMembers: {
      fontSize: 13,
      marginTop: 2,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 15,
    },
  });
