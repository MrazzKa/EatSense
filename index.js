// CRITICAL: These imports MUST be first for Reanimated and Gesture Handler to work correctly
import 'react-native-gesture-handler';
import 'react-native-reanimated';


// Early client logging - log as early as possible to track app startup
let clientLog;
try {
  // Dynamic import to avoid blocking startup if clientLog fails
  clientLog = require('./src/utils/clientLog').clientLog;
  clientLog('index:start').catch(() => { });
} catch (error) {
  // If clientLog import fails, we can't log it, but app should continue
  console.error('[index.js] Failed to import clientLog:', error);
}

import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text } from 'react-native';

let App;
try {
  App = require('./App').default;
  if (clientLog) {
    clientLog('index:AppImportedOK').catch(() => { });
  }
} catch (error) {
  if (clientLog) {
    clientLog('index:AppImportError', {
      message: error?.message || 'Unknown error',
      stack: String(error?.stack || '').substring(0, 500), // Limit stack trace length
    }).catch(() => { });
  }

  console.error('[index.js] Failed to import App:', error);
  console.error('[index.js] Error stack:', error.stack);

  // Fallback App that shows error
  App = function FallbackApp() {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: '#FFFFFF',
        }}
      >
        <Text style={{ fontSize: 18, color: '#E74C3C', textAlign: 'center' }}>
          Ошибка загрузки приложения
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: '#666',
            textAlign: 'center',
            marginTop: 10,
          }}
        >
          {error?.message || 'Unknown error'}
        </Text>
      </View>
    );
  };
}

registerRootComponent(App);
