/**
 * usePushNotifications
 * --------------------
 * Helper hook that registers the device for Expo push notifications,
 * persists permission status, and exposes a method to re-request permissions.
 *
 * Usage:
 * const { expoPushToken, permissionStatus, requestPermission } = usePushNotifications();
 *
 * Persist expoPushToken to your backend when available.
 */
import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  permissionStatus: Notifications.NotificationPermissionsStatus | null;
  requestPermission: () => Promise<Notifications.NotificationPermissionsStatus>;
}

export function usePushNotifications(): PushNotificationState {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.NotificationPermissionsStatus | null>(null);

  const registerForPushNotificationsAsync = useCallback(async () => {
    if (!Device.isDevice) {
      console.warn('[PushNotifications] Must use physical device for push notifications');
      return null;
    }

    const settings = await Notifications.getPermissionsAsync();
    let finalStatus = settings.status;

    if (settings.canAskAgain && finalStatus !== Notifications.PermissionStatus.GRANTED) {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
      setPermissionStatus(requested);
    } else {
      setPermissionStatus(settings);
    }

    if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
      console.warn('[PushNotifications] Permission not granted');
      return null;
    }

    // Check projectId before requesting token - required on iOS
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[PushNotifications] ProjectId not found, cannot get push token');
      return null;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      setExpoPushToken(token.data);
      return token.data;
    } catch (error) {
      console.error('[PushNotifications] Failed to get push token:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    void registerForPushNotificationsAsync();

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[PushNotifications] Notification received', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[PushNotifications] Notification response', response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [registerForPushNotificationsAsync]);

  const requestPermission = useCallback(async () => {
    const status = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);
    if (status.status === Notifications.PermissionStatus.GRANTED) {
      // Check projectId before requesting token - required on iOS
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn('[PushNotifications] ProjectId not found, cannot get push token');
        return status;
      }
      try {
        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        setExpoPushToken(token.data);
      } catch (error) {
        console.error('[PushNotifications] Failed to get push token:', error);
      }
    }
    return status;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      }).catch((error) => console.error('[PushNotifications] channel error', error));
    }
  }, []);

  return {
    expoPushToken,
    permissionStatus,
    requestPermission,
  };
}
