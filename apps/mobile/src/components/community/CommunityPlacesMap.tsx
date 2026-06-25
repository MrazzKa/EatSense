import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { cuisineIcon } from '../../config/cuisines';
import { PLACE_CATEGORY_BY_KEY } from '../../config/placeCategories';
import { isPastEvent } from './eventTime';

const BALLOON_W = 232;

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
  /** Open the full post detail (from the balloon's "Details" action). */
  onOpenDetails: (_post: CommunityPost) => void;
  /** One-tap Join from the balloon (events/routes the user doesn't own). */
  onJoin?: (_post: CommunityPost) => void;
  /** Current user id — to hide Join on the user's own event/route. */
  currentUserId?: string;
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
const CommunityPlacesMap: React.FC<Props> = ({ colors, t, places, events = [], routes = [], onOpenDetails, onJoin, currentUserId, onMapPress, height = 360, fill = false }) => {
  const mapRef = useRef<MapView | null>(null);
  const [ready, setReady] = useState(false);
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mode, setMode] = useState<MapMode>('all');
  // Tapping a pin shows a small balloon anchored right above it (screen coords
  // via pointForCoordinate), instead of a bottom sheet.
  const [balloon, setBalloon] = useState<{ post: any; x: number; y: number } | null>(null);
  // When a marker is tapped, the map's onPress can also fire — swallow the map
  // press that immediately follows a marker tap.
  const lastMarkerTap = useRef(0);
  const selectMarker = async (post: any, coord: { latitude: number; longitude: number }) => {
    lastMarkerTap.current = Date.now();
    try {
      const pt = await mapRef.current?.pointForCoordinate(coord);
      if (pt) setBalloon({ post, x: pt.x, y: pt.y });
      else setBalloon({ post, x: -1, y: -1 });
    } catch {
      setBalloon({ post, x: -1, y: -1 });
    }
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
    <View
      style={[fill ? styles.wrapperFill : styles.wrapper, fill ? null : { height }, { borderColor: colors.border || '#E5E7EB' }]}
      onLayout={(e) => setLayout({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
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
          if (balloon) { setBalloon(null); return; } // first tap just dismisses the balloon
          const c = e?.nativeEvent?.coordinate;
          if (c && onMapPress && inSwitzerland(c)) onMapPress({ latitude: c.latitude, longitude: c.longitude });
        }}
        onRegionChange={() => { if (balloon) setBalloon(null); }}
      >
        {visibleRoutes.map(({ post, coord, points }) => (
          <React.Fragment key={`route-${post.id}`}>
            <Polyline coordinates={points} strokeColor={ROUTE_COLOR} strokeWidth={4} />
            <Marker
              coordinate={coord!}
              onPress={() => selectMarker(post, coord!)}
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
          // Non-food places (gym, shop, park, …) get their category icon + colour;
          // food places keep the cuisine icon with the app's primary colour.
          const catDef = post.metadata?.category ? PLACE_CATEGORY_BY_KEY[post.metadata.category] : null;
          const color = isEvent
            ? EVENT_COLOR
            : (catDef && !catDef.isFood ? catDef.color : (colors.primary || '#4F46E5'));
          const icon = isEvent
            ? 'calendar'
            : ((catDef && !catDef.isFood ? catDef.icon : cuisineIcon(post.metadata?.cuisine)) as any);
          return (
            <Marker
              key={`${kind}-${post.id}`}
              coordinate={coord}
              onPress={() => selectMarker(post, coord)}
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
                onPress={() => { setBalloon(null); setMode(f.key); }}
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

      {/* Balloon anchored above the tapped pin (name + 1-tap Join + Details). */}
      {balloon && (() => {
        // Re-read the post from current props so attendance/count stay fresh.
        const fresh =
          [...placePins, ...eventPins].find((x) => x.post.id === balloon.post.id)?.post
          || routeShapes.find((x) => x.post.id === balloon.post.id)?.post
          || balloon.post;
        const meta = fresh.metadata || {};
        const type = fresh.type;
        const joinable = type === 'ROUTE' || type === 'EVENT';
        const isOwn = !!currentUserId && (fresh.authorId === currentUserId || fresh.author?.id === currentUserId);
        const past = joinable && isPastEvent(meta);
        const accent = type === 'ROUTE' ? ROUTE_COLOR : type === 'EVENT' ? EVENT_COLOR : (colors.primary || '#4F46E5');
        const icon = type === 'ROUTE' ? 'map' : type === 'EVENT' ? 'calendar' : 'location';
        const title = meta.routeName || meta.title || meta.placeName || fresh.content || t('community.post.title', 'Post');
        const km = Number(meta.distanceKm) || 0;
        const sub = [
          type === 'ROUTE' && meta.activity ? t(`community.route.activity.${meta.activity}`, meta.activity) : '',
          km > 0 ? `${km.toFixed(1)} ${t('community.route.km', 'km')}` : '',
          meta.city || meta.address || '',
          [meta.date, meta.time].filter(Boolean).join(' '),
        ].filter(Boolean).join(' · ');

        // Place the balloon above the pin; flip below if too close to the top.
        const above = balloon.y > 150;
        const left = layout.w
          ? Math.max(8, Math.min(balloon.x - BALLOON_W / 2, layout.w - BALLOON_W - 8))
          : 8;
        const posStyle: any = above
          ? { bottom: Math.max(8, layout.h - balloon.y + 14), left }
          : { top: balloon.y + 14, left };

        return (
          <View style={[styles.balloon, posStyle, { backgroundColor: colors.surface || '#FFF', borderColor: colors.border || '#E5E7EB' }]}>
            <View style={styles.balloonHead}>
              <View style={[styles.balloonIcon, { backgroundColor: accent + '18' }]}>
                <Ionicons name={icon as any} size={18} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.balloonTitle, { color: colors.textPrimary || colors.text }]} numberOfLines={1}>{title}</Text>
                {!!sub && <Text style={[styles.balloonSub, { color: colors.textSecondary }]} numberOfLines={1}>{sub}</Text>}
              </View>
            </View>
            <View style={styles.balloonActions}>
              {past ? (
                <View style={[styles.balloonJoin, { backgroundColor: (colors.textTertiary || '#9CA3AF') + '20' }]}>
                  <Ionicons name="checkmark-done-outline" size={16} color={colors.textSecondary} />
                  <Text numberOfLines={1} style={[styles.balloonJoinText, { color: colors.textSecondary }]}>{t('community.event.finished', 'Finished')}</Text>
                </View>
              ) : joinable && isOwn ? (
                <View style={[styles.balloonJoin, { backgroundColor: accent + '12' }]}>
                  <Ionicons name="ribbon-outline" size={16} color={accent} />
                  <Text numberOfLines={1} style={[styles.balloonJoinText, { color: accent }]}>{t('community.route.youOrganizer', 'You organize this')}</Text>
                </View>
              ) : joinable ? (
                <TouchableOpacity
                  style={[styles.balloonJoin, { backgroundColor: fresh.isAttending ? accent : accent + '1A' }]}
                  onPress={() => onJoin?.(fresh)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={fresh.isAttending ? 'checkmark-circle' : 'add-circle-outline'} size={16} color={fresh.isAttending ? '#fff' : accent} />
                  <Text numberOfLines={1} style={[styles.balloonJoinText, { color: fresh.isAttending ? '#fff' : accent }]}>
                    {fresh.isAttending ? t('community.route.joined', 'Going') : t('community.route.join', 'Join')}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.balloonDetails, { borderColor: colors.border || '#E5E7EB' }]}
                onPress={() => { const p = fresh; setBalloon(null); onOpenDetails(p); }}
                activeOpacity={0.85}
              >
                <Text numberOfLines={1} style={[styles.balloonDetailsText, { color: colors.textPrimary || colors.text }]}>{t('community.preview.details', 'Details')}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}
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
  balloon: {
    position: 'absolute',
    width: BALLOON_W,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  balloonHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balloonIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  balloonTitle: { fontSize: 15, fontWeight: '700' },
  balloonSub: { fontSize: 12, marginTop: 1 },
  balloonActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  balloonJoin: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 9 },
  balloonJoinText: { flexShrink: 1, fontSize: 13, fontWeight: '700' },
  balloonDetails: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1 },
  balloonDetailsText: { fontSize: 13, fontWeight: '600' },
});

export default CommunityPlacesMap;
