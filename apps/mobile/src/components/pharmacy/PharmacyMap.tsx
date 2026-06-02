import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { GENEVA_PHARMACIES, GENEVA_CENTER, GenevaPharmacy } from '../../data/genevaPharmacies';

type Props = {
  colors: any;
  t: any;
  onSelect: (_pharmacy: GenevaPharmacy) => void;
  selectedId?: string | null;
  /** Pharmacy ids already connected — rendered with a "linked" check. */
  connectedIds?: string[];
};

/**
 * Interactive map of pilot pharmacies (Geneva). Apple Maps on iOS (no key
 * needed), Google Maps on Android (needs EXPO_PUBLIC_GOOGLE_MAPS_API_KEY).
 * Partner pharmacies get a filled pin; discovery-only pins are muted.
 */
const PharmacyMap: React.FC<Props> = ({ colors, t, onSelect, selectedId, connectedIds = [] }) => {
  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState<Region>(GENEVA_CENTER);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        let granted = status === 'granted';
        if (!granted) {
          const req = await Location.requestForegroundPermissionsAsync();
          granted = req.status === 'granted';
        }
        if (!granted) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserCoords(coords);
        // Only recentre on the user if they're near Geneva (pilot area), so a
        // user elsewhere still sees the partner pins rather than empty sea.
        const nearGeneva =
          Math.abs(coords.latitude - GENEVA_CENTER.latitude) < 0.3 &&
          Math.abs(coords.longitude - GENEVA_CENTER.longitude) < 0.3;
        if (nearGeneva) {
          setRegion((r) => ({ ...r, ...coords }));
        }
      } catch {
        // Location is optional — silently fall back to the Geneva centre.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={[styles.wrapper, { borderColor: colors.border || '#E5E7EB' }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={GENEVA_CENTER}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={!!userCoords}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        onMapReady={() => setReady(true)}
      >
        {GENEVA_PHARMACIES.map((p) => {
          const isSelected = selectedId === p.id;
          const isConnected = connectedIds.includes(p.id);
          const pinColor = isConnected
            ? colors.success || '#10B981'
            : p.partner
              ? colors.primary || '#4F46E5'
              : colors.textTertiary || '#9CA3AF';
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              onPress={() => onSelect(p)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerWrap}>
                <View
                  style={[
                    styles.markerBubble,
                    { backgroundColor: pinColor, transform: [{ scale: isSelected ? 1.15 : 1 }] },
                  ]}
                >
                  <Ionicons
                    name={isConnected ? 'checkmark' : 'medkit'}
                    size={14}
                    color="#FFF"
                  />
                </View>
                <View style={[styles.markerTip, { borderTopColor: pinColor }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {!ready && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('pharmacy.map.loading', 'Loading map…')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  map: { ...StyleSheet.absoluteFillObject },
  markerWrap: { alignItems: 'center' },
  markerBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  markerTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 8, fontSize: 13 },
});

export default PharmacyMap;
