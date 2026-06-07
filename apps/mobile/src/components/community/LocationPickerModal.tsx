import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export type PickedLocation = {
  latitude: number;
  longitude: number;
  address?: string;
};

type Props = {
  visible: boolean;
  colors: any;
  t: any;
  initial?: PickedLocation | null;
  onClose: () => void;
  onConfirm: (_loc: PickedLocation) => void;
};

const DEFAULT_REGION: Region = {
  latitude: 46.2044,
  longitude: 6.1432,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

/**
 * Full-screen location picker. Two ways to set a point (per product decision):
 *  1. Tap on the map to drop a pin.
 *  2. Type an address and press search (forward geocode via expo-location).
 * On pin placement we reverse-geocode to suggest a human-readable address.
 * No API keys needed (Apple Maps on iOS / expo-location geocoder).
 */
const LocationPickerModal: React.FC<Props> = ({ visible, colors, t, initial, onClose, onConfirm }) => {
  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchError, setSearchError] = useState('');
  // react-native-maps renders a blank/gray map when mounted inside an RN <Modal>
  // before the modal window is laid out (iOS). Mount the MapView only after the
  // modal is actually presented (onShow) so it gets a valid window to draw into.
  const [mapMounted, setMapMounted] = useState(false);

  // Reset the lazy-mount flag whenever the picker is hidden, so the map remounts
  // fresh (and non-blank) on the next open.
  useEffect(() => {
    if (!visible) setMapMounted(false);
  }, [visible]);

  // Seed from initial value (editing) or the user's location when opened.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      if (initial?.latitude && initial?.longitude) {
        setMarker({ latitude: initial.latitude, longitude: initial.longitude });
        setAddress(initial.address || '');
        const r = { latitude: initial.latitude, longitude: initial.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
        setRegion(r);
        return;
      }
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        let granted = status === 'granted';
        if (!granted) {
          const req = await Location.requestForegroundPermissionsAsync();
          granted = req.status === 'granted';
        }
        if (!granted || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 });
      } catch {
        // Location optional — fall back to default region.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, initial?.latitude, initial?.longitude]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const r = results?.[0];
      if (r) {
        const parts = [
          [r.street, r.streetNumber].filter(Boolean).join(' '),
          [r.postalCode, r.city].filter(Boolean).join(' '),
        ].filter(Boolean);
        const a = parts.join(', ');
        if (a) setAddress(a);
      }
    } catch {
      // Reverse geocode is best-effort.
    }
  };

  const handleMapPress = (e: any) => {
    const coord = e?.nativeEvent?.coordinate;
    if (!coord) return;
    setMarker(coord);
    setSearchError('');
    reverseGeocode(coord.latitude, coord.longitude);
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    Keyboard.dismiss();
    setBusy(true);
    setSearchError('');
    try {
      const results = await Location.geocodeAsync(q);
      const r = results?.[0];
      if (!r) {
        setSearchError(t('community.location.notFound', 'Address not found'));
        return;
      }
      const coord = { latitude: r.latitude, longitude: r.longitude };
      setMarker(coord);
      setAddress(q);
      const next = { ...coord, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setRegion(next);
      mapRef.current?.animateToRegion(next, 350);
    } catch {
      setSearchError(t('community.location.searchFailed', 'Search failed'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!marker) return;
    onConfirm({ latitude: marker.latitude, longitude: marker.longitude, address: address.trim() || undefined });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => setMapMounted(true)}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.headerCancel, { color: colors.textSecondary }]}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('community.location.pickTitle', 'Pick location')}
          </Text>
          <TouchableOpacity
            onPress={confirm}
            disabled={!marker}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.headerDone, { color: marker ? colors.primary : colors.textTertiary }]}>
              {t('common.done', 'Done')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchRow, { backgroundColor: colors.surfaceSecondary || colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('community.location.searchPlaceholder', 'Search address…')}
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            query.length > 0 && (
              <TouchableOpacity onPress={handleSearch}>
                <Text style={[styles.searchGo, { color: colors.primary }]}>{t('common.search', 'Search')}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
        {!!searchError && <Text style={[styles.errorText, { color: colors.error || '#EF4444' }]}>{searchError}</Text>}

        <View style={styles.mapWrap}>
          {!mapMounted && (
            <View style={[StyleSheet.absoluteFill, styles.mapLoading, { backgroundColor: colors.surfaceSecondary || colors.surface }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
          {mapMounted && (
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
            toolbarEnabled={false}
          >
            {marker && (
              <Marker coordinate={marker} draggable onDragEnd={handleMapPress} anchor={{ x: 0.5, y: 1 }}>
                <View style={styles.pin}>
                  <View style={[styles.pinBubble, { backgroundColor: colors.primary || '#4F46E5' }]}>
                    <Ionicons name="location" size={16} color="#FFF" />
                  </View>
                  <View style={[styles.pinTip, { borderTopColor: colors.primary || '#4F46E5' }]} />
                </View>
              </Marker>
            )}
          </MapView>
          )}

          {mapMounted && !marker && (
            <View pointerEvents="none" style={styles.hint}>
              <View style={[styles.hintPill, { backgroundColor: colors.surface }]}>
                <Ionicons name="hand-left-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                  {t('community.location.tapHint', 'Tap the map to set the spot')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {!!address && (
          <View style={[styles.addressBar, { backgroundColor: colors.surfaceSecondary || colors.surface, borderTopColor: colors.border }]}>
            <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.addressText, { color: colors.textPrimary }]} numberOfLines={2}>
              {address}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 64 },
  headerCancel: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerDone: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  searchGo: { fontSize: 14, fontWeight: '600' },
  errorText: { marginHorizontal: 16, marginTop: 6, fontSize: 13 },
  mapWrap: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden' },
  mapLoading: { alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  hint: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  hintText: { fontSize: 13, fontWeight: '500' },
  pin: { alignItems: 'center' },
  pinBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addressText: { flex: 1, fontSize: 14 },
});

export default LocationPickerModal;
