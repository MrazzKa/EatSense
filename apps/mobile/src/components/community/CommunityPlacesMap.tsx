import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { cuisineIcon } from '../../config/cuisines';

type PlacePost = {
  id: string;
  metadata?: any;
};

type Props = {
  colors: any;
  t: any;
  places: PlacePost[];
  onSelect: (_post: PlacePost) => void;
  height?: number;
};

const GENEVA_FALLBACK: Region = {
  latitude: 46.2044,
  longitude: 6.1432,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function coordsOf(post: PlacePost): { latitude: number; longitude: number } | null {
  const m = post?.metadata || {};
  const lat = Number(m.latitude);
  const lng = Number(m.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { latitude: lat, longitude: lng };
  }
  return null;
}

/**
 * Map of community "best places" that have coordinates in their metadata.
 * Places without coordinates are simply not shown on the map (they still
 * appear in the list view). Apple Maps on iOS (no key needed).
 */
const CommunityPlacesMap: React.FC<Props> = ({ colors, t, places, onSelect, height = 360 }) => {
  const mapRef = useRef<MapView | null>(null);
  const [ready, setReady] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const withCoords = places
    .map((p) => ({ post: p, coord: coordsOf(p) }))
    .filter((x) => x.coord) as { post: PlacePost; coord: { latitude: number; longitude: number } }[];

  // Initial region: fit to the first place, else user, else Geneva.
  const initialRegion: Region = withCoords[0]
    ? { ...withCoords[0].coord, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : GENEVA_FALLBACK;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        // optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fit all markers once the map is ready.
  useEffect(() => {
    if (!ready || withCoords.length < 2) return;
    const id = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        withCoords.map((x) => x.coord),
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: false },
      );
    }, 300);
    return () => clearTimeout(id);
  }, [ready, withCoords.length]);

  return (
    <View style={[styles.wrapper, { height, borderColor: colors.border || '#E5E7EB' }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={!!userCoords}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        onMapReady={() => setReady(true)}
      >
        {withCoords.map(({ post, coord }) => {
          const cuisine = post.metadata?.cuisine;
          return (
            <Marker
              key={post.id}
              coordinate={coord}
              onPress={() => onSelect(post)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerWrap}>
                <View style={[styles.markerBubble, { backgroundColor: colors.primary || '#4F46E5' }]}>
                  <Ionicons name={cuisineIcon(cuisine) as any} size={15} color="#FFF" />
                </View>
                <View style={[styles.markerTip, { borderTopColor: colors.primary || '#4F46E5' }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {!ready && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {ready && withCoords.length === 0 && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]} pointerEvents="none">
          <Ionicons name="map-outline" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('community.placesView.noMapPins', 'No places with a map location yet')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    margin: 16,
  },
  markerWrap: { alignItems: 'center' },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 14, paddingHorizontal: 24, textAlign: 'center' },
});

export default CommunityPlacesMap;
