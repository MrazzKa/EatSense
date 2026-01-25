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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>EatSense Smoke Test</Text>
      <Text style={styles.subtitle}>
        If you see this screen — JS tree mounted successfully.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handlePing}>
        <Text style={styles.buttonText}>Ping API</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleOpenApp}>
        <Text style={[styles.buttonText, styles.primaryButtonText]}>Open App</Text>
      </TouchableOpacity>

      <Text style={styles.buildInfo}>
        Build: {process.env.EXPO_PUBLIC_ENV || 'n/a'}
      </Text>
    </ScrollView>
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

