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

  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(tokens, colors), [tokens, colors]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const data = await ApiService.getCityCommunityGroups();
        setCities(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        console.warn('Failed to load city groups:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCities();
  }, []);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    const query = searchQuery.toLowerCase();
    return cities.filter((city: any) => city.name?.toLowerCase().includes(query));
  }, [cities, searchQuery]);

  const handleDetectLocation = useCallback(async () => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('community.locationDenied', 'Location Access'),
          t('community.locationDeniedDesc', 'Please enable location access in Settings to detect your city.'),
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
        const cityName = reverseGeocode[0].city || reverseGeocode[0].subregion || reverseGeocode[0].region;
        if (cityName) {
          // Try to find a matching city group
          const match = cities.find(
            (c: any) => c.name?.toLowerCase() === cityName.toLowerCase(),
          );
          if (match) {
            await selectCity(match.id);
          } else {
            Alert.alert(
              t('community.cityNotFound', 'City Not Found'),
              t('community.cityNotFoundDesc', `We detected "${cityName}" but it's not available yet. Please select manually.`),
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
  }, [cities, navigation, refreshUser, t]);

  const selectCity = useCallback(
    async (cityGroupId: string) => {
      setSelecting(cityGroupId);
      try {
        await ApiService.setMyCity(cityGroupId);
        await refreshUser();
        navigation.goBack();
      } catch (err) {
        console.warn('Failed to set city:', err);
        Alert.alert(t('community.error', 'Error'), t('community.setCityFailed', 'Failed to set your city'));
      } finally {
        setSelecting(null);
      }
    },
    [navigation, refreshUser, t],
  );

  const renderCityItem = useCallback(
    ({ item }: any) => (
      <TouchableOpacity
        style={[styles.cityItem, { borderBottomColor: colors.border }]}
        onPress={() => selectCity(item.id)}
        disabled={selecting === item.id}
        activeOpacity={0.6}
      >
        <Ionicons name="location" size={20} color={colors.primary} />
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
    [colors, selecting, selectCity, t, styles],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || colors.text }]}>
          {t('community.selectCity', 'Select Your City')}
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
          placeholder={t('community.searchCity', 'Search cities...')}
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

      {/* City list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCities}
          keyExtractor={(item) => item.id}
          renderItem={renderCityItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {searchQuery
                  ? t('community.noCitiesFound', 'No cities match your search')
                  : t('community.noCities', 'No cities available')}
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
