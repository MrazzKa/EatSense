import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { parsePharmacyCode } from '../../utils/pharmacyCode';

type Props = {
  visible: boolean;
  colors: any;
  t: any;
  onClose: () => void;
  /** Called with the parsed pharmacy code once a valid QR is scanned. */
  onScanned: (_code: string) => void;
};

/**
 * In-app QR scanner for pharmacy codes. Reads the universal link / deep link /
 * bare code from the QR (see parsePharmacyCode) and hands the code back.
 * Mirrors the CameraView usage in screens/CameraScreen.tsx.
 */
const PharmacyQRScannerModal: React.FC<Props> = ({ visible, colors, t, onClose, onScanned }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (visible) {
      handledRef.current = false;
      setError(false);
      if (permission && !permission.granted && permission.canAskAgain) {
        requestPermission().catch(() => {});
      }
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBarcode = (e: any) => {
    if (handledRef.current) return;
    const raw = e?.data;
    const code = parsePharmacyCode(raw);
    if (!code) {
      setError(true);
      return;
    }
    handledRef.current = true;
    onScanned(code);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('pharmacy.scanTitle', 'Scan pharmacy QR')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.cameraWrap}>
          {!permission ? (
            <ActivityIndicator color="#FFF" />
          ) : !permission.granted ? (
            <View style={styles.center}>
              <Ionicons name="camera-outline" size={40} color="#FFF" />
              <Text style={styles.permText}>
                {t('pharmacy.scanPermission', 'Allow camera access to scan the pharmacy QR code.')}
              </Text>
              <TouchableOpacity
                style={[styles.permBtn, { backgroundColor: colors.primary || '#4F46E5' }]}
                onPress={() => requestPermission().catch(() => {})}
              >
                <Text style={styles.permBtnText}>{t('common.allow', 'Allow')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcode}
              />
              <View pointerEvents="none" style={styles.frame} />
              <Text style={styles.hint}>
                {error
                  ? t('pharmacy.scanInvalid', 'That QR is not a pharmacy code. Try another.')
                  : t('pharmacy.scanHint', 'Point the camera at the pharmacy QR code.')}
              </Text>
            </>
          )}
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
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  cameraWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', paddingHorizontal: 32, gap: 14 },
  permText: { color: '#FFF', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  frame: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  hint: {
    position: 'absolute',
    bottom: 48,
    paddingHorizontal: 24,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default PharmacyQRScannerModal;
