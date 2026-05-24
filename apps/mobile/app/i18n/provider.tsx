import React, { useEffect, useState } from 'react';

import { ensureI18nReady } from './config';

interface I18nProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, fallback = null }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    ensureI18nReady()
      .catch((error) => {
        console.warn('[i18n] Failed to initialize:', error);
        // Even if i18n fails, we should show the app with fallback
        // The app will use default translations
      })
      .finally(() => {
        if (mounted) {
          setIsReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};


