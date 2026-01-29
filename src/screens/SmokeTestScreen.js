import React, { useEffect } from 'react';
import { Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { clientLog } from '../utils/clientLog';

export default function SmokeTestScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    clientLog('SmokeTest:mounted').catch(() => { });
  }, []);

  const handlePing = async () => {
    await clientLog('App:pingButtonPressed').catch(() => { });
    try {
      const res = await fetch('https://eatsense-production.up.railway.app/.well-known/health');
      const text = await res.text();
      await clientLog('App:pingSuccess', {
        status: res.status,
        body: text.slice(0, 200),
      }).catch(() => { });
    } catch (e) {
      await clientLog('App:pingError', {
        message: e?.message || String(e),
      }).catch(() => { });
    }
  };

  const handleOpenApp = async () => {
    await clientLog('SmokeTest:openAppPressed').catch(() => { });

    try {
      // Переход в реальное приложение - на AuthScreen (начало флоу)
      // Используем navigate для мягкого перехода (reset может быть слишком агрессивным)
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('Auth');
      } else if (navigation && typeof navigation.reset === 'function') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      } else {
        await clientLog('SmokeTest:openAppError', {
          message: 'Navigation not available or reset not a function',
        }).catch(() => { });
      }
    } catch (error) {
      await clientLog('SmokeTest:openAppError', {
        message: error?.message || String(error),
        stack: String(error?.stack || '').substring(0, 500),
      }).catch(() => { });
    }
  };

  return (
    <View style={{ flex: 1, padding: 50, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>{i18n.t('smokeTest.title')}</Text>
      <Text style={{ marginBottom: 10 }}>Environment: {JSON.stringify(process.env.NODE_ENV)}</Text>
      <Text style={{ marginBottom: 20 }}>API URL: {ApiService.config.baseURL}</Text>

      <Button
        title={loading ? "Pinging..." : i18n.t('smokeTest.pingApi')}
        onPress={pingApi}
        disabled={loading}
      />

      <View style={{ height: 20 }} />

      <Button
        title={i18n.t('smokeTest.openApp')}
        onPress={() => navigation.replace('MainTabs')}
      />

      <Text style={styles.buildInfo}>
        Build: {process.env.EXPO_PUBLIC_ENV || 'n/a'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  buildInfo: {
    fontSize: 12,
    color: '#888',
    marginTop: 16,
  },
});

