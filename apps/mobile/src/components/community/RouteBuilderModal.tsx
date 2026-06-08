import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export type RoutePoint = { latitude: number; longitude: number };
export type BuiltRoute = {
  points: RoutePoint[];
  meetingPoint: RoutePoint; // first point = start / meeting spot
  distanceKm: number;
};

type Props = {
  visible: boolean;
  colors: any;
  t: any;
  initial?: BuiltRoute | null;
  onClose: () => void;
  onConfirm: (_route: BuiltRoute) => void;
};

const DEFAULT_REGION: Region = {
  latitude: 46.8,
  longitude: 8.23,
  latitudeDelta: 2.6,
  longitudeDelta: 3.4,
};

// Pilot scope is Switzerland-only (the community map hides routes outside CH). Only
// recenter on the user's GPS if it's inside Switzerland — a tester abroad otherwise
// draws a route that silently vanishes from the map. Default = the whole country.
const CH_BOUNDS = { minLat: 45.8, maxLat: 47.85, minLng: 5.9, maxLng: 10.6 };
const inSwitzerland = (lat: number, lng: number) =>
  lat >= CH_BOUNDS.minLat && lat <= CH_BOUNDS.maxLat && lng >= CH_BOUNDS.minLng && lng <= CH_BOUNDS.maxLng;

// Haversine distance (km) between two coordinates.
function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function totalDistanceKm(points: RoutePoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversineKm(points[i - 1], points[i]);
  return d;
}

/**
 * Full-screen route builder. Tap the map to drop waypoints — the FIRST point is
 * the meeting/start spot, the rest form the running/walking/cycling line. Distance
 * is computed live (Haversine). Undo removes the last point; clear resets.
 * MapView is mounted only after the modal is shown (onShow) — react-native-maps
 * renders blank inside an RN <Modal> on iOS before the window is laid out.
 */
const RouteBuilderModal: React.FC<Props> = ({ visible, colors, t, initial, onClose, onConfirm }) => {
  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [mapMounted, setMapMounted] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMapMounted(false);
      return;
    }
    let cancelled = false;
    (async () => {
      if (initial?.points?.length) {
        setPoints(initial.points);
        const p0 = initial.points[0];
        setRegion({ latitude: p0.latitude, longitude: p0.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        return;
      }
      setPoints([]);
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
        // Only recenter on the user if they're inside Switzerland; otherwise stay on CH.
        if (inSwitzerland(pos.coords.latitude, pos.coords.longitude)) {
          setRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 });
        }
      } catch {
        // optional — keep default region (whole Switzerland)
      }
    })();
    return () => { cancelled = true; };
  }, [visible, initial?.points]);

  const handleMapPress = (e: any) => {
    const coord = e?.nativeEvent?.coordinate;
    if (!coord) return;
    setPoints((prev) => [...prev, { latitude: coord.latitude, longitude: coord.longitude }]);
  };

  const undo = () => setPoints((prev) => prev.slice(0, -1));
  const clear = () => setPoints([]);
  // Drag a placed point to fix its position without clearing the whole route.
  const movePoint = (index: number, coord: RoutePoint) =>
    setPoints((prev) => prev.map((p, i) => (i === index ? { latitude: coord.latitude, longitude: coord.longitude } : p)));

  const distance = totalDistanceKm(points);

  const confirm = () => {
    if (points.length < 2) return;
    onConfirm({ points, meetingPoint: points[0], distanceKm: Math.round(distance * 100) / 100 });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => setMapMounted(true)}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.headerCancel, { color: colors.textSecondary }]}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('community.route.builderTitle', 'Draw route')}
          </Text>
          <TouchableOpacity onPress={confirm} disabled={points.length < 2} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.headerDone, { color: points.length >= 2 ? colors.primary : colors.textTertiary }]}>
              {t('common.done', 'Done')}
            </Text>
          </TouchableOpacity>
        </View>

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
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
              toolbarEnabled={false}
            >
              {points.length >= 2 && (
                <Polyline coordinates={points} strokeColor={colors.primary || '#4F46E5'} strokeWidth={4} />
              )}
              {points.map((p, i) => (
                <Marker
                  key={`${i}`}
                  coordinate={p}
                  anchor={{ x: 0.5, y: i === 0 ? 1 : 0.5 }}
                  draggable
                  onDragEnd={(e) => movePoint(i, e.nativeEvent.coordinate)}
                >
                  {i === 0 ? (
                    <View style={styles.startPin}>
                      <View style={[styles.startBubble, { backgroundColor: colors.primary || '#4F46E5' }]}>
                        <Ionicons name="flag" size={14} color="#FFF" />
                      </View>
                      <View style={[styles.pinTip, { borderTopColor: colors.primary || '#4F46E5' }]} />
                    </View>
                  ) : (
                    <View style={[styles.dot, { backgroundColor: colors.primary || '#4F46E5' }]} />
                  )}
                </Marker>
              ))}
            </MapView>
          )}

          {mapMounted && points.length < 2 && (
            <View pointerEvents="none" style={styles.hint}>
              <View style={[styles.hintPill, { backgroundColor: colors.surface }]}>
                <Ionicons name={points.length === 0 ? 'flag-outline' : 'add-circle-outline'} size={16} color={colors.primary} />
                <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                  {points.length === 0
                    ? t('community.route.tapStart', 'Tap to set the meeting point, then the route')
                    : t('community.route.tapNext', 'Keep tapping to draw the route — points connect into a line')}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surfaceSecondary || colors.surface }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{distance.toFixed(2)}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('community.route.km', 'km')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{points.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{t('community.route.points', 'points')}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={undo} disabled={points.length === 0} style={[styles.actionBtn, { opacity: points.length === 0 ? 0.4 : 1 }]}>
            <Ionicons name="arrow-undo" size={18} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>{t('community.route.undo', 'Undo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clear} disabled={points.length === 0} style={[styles.actionBtn, { opacity: points.length === 0 ? 0.4 : 1 }]}>
            <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
            <Text style={[styles.actionText, { color: colors.error || '#EF4444' }]}>{t('community.route.clear', 'Clear')}</Text>
          </TouchableOpacity>
        </View>
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
  mapWrap: { flex: 1 },
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
  startPin: { alignItems: 'center' },
  startBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
});

export default RouteBuilderModal;
