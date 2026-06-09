import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { cuisineIcon } from '../../config/cuisines';

type CommunityPost = {
  id: string;
  metadata?: any;
};

type MapMode = 'all' | 'places' | 'events' | 'routes';

type Props = {
  colors: any;
  t: any;
  places: CommunityPost[];
  events?: CommunityPost[];
  routes?: CommunityPost[];
  onSelect: (_post: CommunityPost) => void;
  /** Tap on empty map → add something here (place / event / route). */
  onMapPress?: (_coord: { latitude: number; longitude: number }) => void;
  height?: number;
  /** Fill the available space (flex:1, edge-to-edge) instead of a fixed-height card. */
  fill?: boolean;
};

const ROUTE_ACTIVITY_ICON: Record<string, any> = {
  run: 'walk',
  walk: 'footsteps',
  bike: 'bicycle',
};

// Pilot is Switzerland-only: the map opens on the whole country and we never
// show pins that fall outside Swiss borders.
const SWITZERLAND_REGION: Region = {
  latitude: 46.8,
  longitude: 8.23,
  latitudeDelta: 2.6,
  longitudeDelta: 3.4,
};
const CH_BOUNDS = { minLat: 45.8, maxLat: 47.85, minLng: 5.9, maxLng: 10.6 };

const EVENT_COLOR = '#F59E0B';
const ROUTE_COLOR = '#8B5CF6';

function routePointsOf(post: CommunityPost): { latitude: number; longitude: number }[] {
  const pts = post?.metadata?.points;
  if (!Array.isArray(pts)) return [];
  return pts
    .map((p: any) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
}

function inSwitzerland(c: { latitude: number; longitude: number }): boolean {
  return c.latitude >= CH_BOUNDS.minLat && c.latitude <= CH_BOUNDS.maxLat
    && c.longitude >= CH_BOUNDS.minLng && c.longitude <= CH_BOUNDS.maxLng;
}

function coordsOf(post: CommunityPost): { latitude: number; longitude: number } | null {
  const m = post?.metadata || {};
  const lat = Number(m.latitude);
  const lng = Number(m.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { latitude: lat, longitude: lng };
  }
  return null;
}

type Pin = { post: CommunityPost; coord: { latitude: number; longitude: number }; kind: 'place' | 'event' };

/**
 * Switzerland-focused community map. Shows "best places" and upcoming community
 * events that carry coordinates in their metadata, with a Places/Events filter.
 * Pins outside Switzerland are hidden (pilot scope). Apple Maps on iOS (no key).
 */
const CommunityPlacesMap: React.FC<Props> = ({ colors, t, places, events = [], routes = [], onSelect, onMapPress, height = 360, fill = false }) => {
  const mapRef = useRef<MapView | null>(null);
  const [ready, setReady] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mode, setMode] = useState<MapMode>('all');
  // When a marker is tapped, the map's onPress can also fire and open the
  // "What's here?" sheet on top of the opened post. Swallow the map press that
  // immediately follows a marker tap.
  const lastMarkerTap = useRef(0);
  const selectMarker = (post: any) => {
    lastMarkerTap.current = Date.now();
    onSelect(post);
  };

  const placePins: Pin[] = useMemo(
    () => places
      .map((p) => ({ post: p, coord: coordsOf(p), kind: 'place' as const }))
      .filter((x) => x.coord && inSwitzerland(x.coord)) as Pin[],
    [places],
  );
  const eventPins: Pin[] = useMemo(
    () => events
      .map((p) => ({ post: p, coord: coordsOf(p), kind: 'event' as const }))
      .filter((x) => x.coord && inSwitzerland(x.coord)) as Pin[],
    [events],
  );
  // Routes: start (meeting) marker + full polyline. Kept only if the start is in CH.
  const routeShapes = useMemo(
    () => routes
      .map((p) => ({ post: p, coord: coordsOf(p), points: routePointsOf(p) }))
      .filter((x) => x.coord && inSwitzerland(x.coord) && x.points.length >= 2),
    [routes],
  );

  const visiblePins: Pin[] = useMemo(() => {
    if (mode === 'places') return placePins;
    if (mode === 'events') return eventPins;
    if (mode === 'routes') return [];
    return [...placePins, ...eventPins];
  }, [mode, placePins, eventPins]);

  const visibleRoutes = useMemo(
    () => (mode === 'all' || mode === 'routes') ? routeShapes : [],
    [mode, routeShapes],
  );

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
    return () => { cancelled = true; };
  }, []);

  // Fit visible markers + route points (or reset to all of Switzerland when none/one).
  const fitToData = useCallback(() => {
    const coords = [
      ...visiblePins.map((x) => x.coord),
      ...visibleRoutes.flatMap((r) => r.points),
    ];
    if (coords.length >= 2) {
      mapRef.current?.fitToCoordinates(
        coords,
        { edgePadding: { top: 70, right: 60, bottom: 70, left: 60 }, animated: true },
      );
    } else if (coords.length === 1) {
      mapRef.current?.animateToRegion(
        { ...coords[0], latitudeDelta: 0.08, longitudeDelta: 0.08 },
        400,
      );
    } else {
      mapRef.current?.animateToRegion(SWITZERLAND_REGION, 400);
    }
  }, [visiblePins, visibleRoutes]);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(fitToData, 250);
    return () => clearTimeout(id);
  }, [ready, fitToData]);

  const filters: Array<{ key: MapMode; label: string }> = [
    { key: 'all', label: t('community.mapFilter.all', 'All') },
    { key: 'places', label: t('community.mapFilter.places', 'Places') },
    { key: 'events', label: t('community.mapFilter.events', 'Events') },
    { key: 'routes', label: t('community.mapFilter.routes', 'Routes') },
  ];

  return (
    <View style={[fill ? styles.wrapperFill : styles.wrapper, fill ? null : { height }, { borderColor: colors.border || '#E5E7EB' }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={SWITZERLAND_REGION}
        showsUserLocation={!!userCoords}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        onMapReady={() => setReady(true)}
        onPress={(e) => {
          if (Date.now() - lastMarkerTap.current < 500) return; // marker tap, not empty map
          const c = e?.nativeEvent?.coordinate;
          if (c && onMapPress && inSwitzerland(c)) onMapPress({ latitude: c.latitude, longitude: c.longitude });
        }}
      >
        {visibleRoutes.map(({ post, coord, points }) => (
          <React.Fragment key={`route-${post.id}`}>
            <Polyline coordinates={points} strokeColor={ROUTE_COLOR} strokeWidth={4} />
            <Marker
              coordinate={coord!}
              onPress={() => selectMarker(post)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerWrap}>
                <View style={[styles.markerBubble, { backgroundColor: ROUTE_COLOR }]}>
                  <Ionicons name={ROUTE_ACTIVITY_ICON[post.metadata?.activity] || 'map'} size={15} color="#FFF" />
                </View>
                <View style={[styles.markerTip, { borderTopColor: ROUTE_COLOR }]} />
              </View>
            </Marker>
          </React.Fragment>
        ))}
        {visiblePins.map(({ post, coord, kind }) => {
          const isEvent = kind === 'event';
          const color = isEvent ? EVENT_COLOR : (colors.primary || '#4F46E5');
          const icon = isEvent ? 'calendar' : (cuisineIcon(post.metadata?.cuisine) as any);
          return (
            <Marker
              key={`${kind}-${post.id}`}
              coordinate={coord}
              onPress={() => selectMarker(post)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerWrap}>
                <View style={[styles.markerBubble, { backgroundColor: color }]}>
                  <Ionicons name={icon} size={15} color="#FFF" />
                </View>
                <View style={[styles.markerTip, { borderTopColor: color }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Places / Events filter */}
      <View style={styles.filterBar} pointerEvents="box-none">
        <View style={[styles.filterPill, { backgroundColor: colors.surface || '#FFF', borderColor: colors.border || '#E5E7EB' }]}>
          {filters.map((f) => {
            const active = mode === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && { backgroundColor: colors.primary || '#4F46E5' }]}
                onPress={() => setMode(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, { color: active ? '#FFF' : (colors.textSecondary || '#666') }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Recenter — re-fit the map to all visible pins/routes (or Switzerland). */}
      <TouchableOpacity
        style={[styles.recenterBtn, { backgroundColor: colors.surface || '#FFF', borderColor: colors.border || '#E5E7EB' }]}
        onPress={fitToData}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="scan-outline" size={20} color={colors.primary || '#4F46E5'} />
      </TouchableOpacity>

      {!ready && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {ready && visiblePins.length === 0 && visibleRoutes.length === 0 && (
        <View style={[styles.overlay, styles.emptyOverlay]} pointerEvents="none">
          <Ionicons name="map-outline" size={40} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {mode === 'events'
              ? t('community.mapFilter.noEvents', 'No events on the map yet')
              : mode === 'routes'
                ? t('community.route.noRoutes', 'No routes on the map yet')
                : t('community.placesView.noMapPins', 'No places with a map location yet')}
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
  // Full-bleed map that fills the tab below the header (edge-to-edge, no card).
  wrapperFill: {
    flex: 1,
    overflow: 'hidden',
  },
  filterBar: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recenterBtn: {
    position: 'absolute',
    top: 56,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  filterPill: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
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
  emptyOverlay: {
    backgroundColor: 'transparent',
    top: 56,
  },
  emptyText: { fontSize: 14, paddingHorizontal: 24, textAlign: 'center' },
});

export default CommunityPlacesMap;
