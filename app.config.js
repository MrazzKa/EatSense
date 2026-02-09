// Expo SDK 54 with RN 0.81.5 + React 19.1 - expo-dev-client is compatible
export default {
  expo: {
    name: "EatSense",
    slug: "eatsense",
    owner: "eatsense",
    version: "1.0.4",
    orientation: "default",
    // EAS Update configuration
    updates: {
      url: "https://u.expo.dev/cb87892c-d49d-4ac9-81d6-855083eaf0c3"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    // Use requested logo
    icon: "./assets/logo/Logo.jpg",
    userInterfaceStyle: "light",

    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      environment: process.env.EXPO_PUBLIC_ENV,
      // Google OAuth Client IDs (separate for iOS/Android/Web)
      // IMPORTANT: iOS Client ID must be created in Google Cloud Console with bundle ID: ch.eatsense.app
      // See: https://console.cloud.google.com/apis/credentials
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID, // Legacy fallback
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      eas: {
        projectId: "cb87892c-d49d-4ac9-81d6-855083eaf0c3"
      }
    },

    splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#ffffff" },
    scheme: "eatsense",

    ios: {
      bundleIdentifier: "ch.eatsense.app",
      buildNumber: "6",
      developmentTeam: "73T7PB4F99",
      supportsTablet: true,
      infoPlist: {
        CFBundleDisplayName: "EatSense",
        CFBundleName: "EatSense",
        ITSAppUsesNonExemptEncryption: false,
        CADisableMinimumFrameDurationOnPhone: true,
        NSAllowsLocalNetworking: true,
        NSCameraUsageDescription:
          "EatSense needs access to your camera to take photos of food for nutrition analysis.",
        NSPhotoLibraryUsageDescription:
          "EatSense needs access to your photo library to select food photos for nutrition analysis.",
        NSPhotoLibraryAddUsageDescription:
          "EatSense needs access to save analyzed food photos to your library.",
        NSLocationWhenInUseUsageDescription:
          "EatSense may use your location to provide location-based nutrition recommendations (optional).",
        NSHealthShareUsageDescription:
          "EatSense can integrate with HealthKit to sync nutrition data (optional).",
        NSHealthUpdateUsageDescription:
          "EatSense can update HealthKit with your nutrition data (optional).",
        NSMicrophoneUsageDescription:
          "Allow EatSense to access your microphone",
        NSFaceIDUsageDescription:
          "Allow EatSense to access your Face ID biometric data."
      },
      associatedDomains: ["applinks:eatsense.app", "applinks:*.eatsense.app"],
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
          }
        ]
      }
    },

    android: {
      package: "ch.eatsense.app",
      versionCode: 62,
      adaptiveIcon: { foregroundImage: "./assets/logo/Logo.jpg", backgroundColor: "#FFFFFF" },
      permissions: ["CAMERA", "READ_MEDIA_IMAGES", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "POST_NOTIFICATIONS"],
      intentFilters: [{
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "eatsense.app", pathPrefix: "/v1/auth/magic/consume" },
          { scheme: "https", host: "eatsense.app", pathPrefix: "/auth/google/callback" },
          { scheme: "eatsense" }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }]
    },

    web: { favicon: "./assets/logo/Logo.jpg" },
    notification: { icon: "./assets/icon.png", color: "#FF6B6B", androidMode: "default", androidCollapsedTitle: "EatSense" },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "15.1"
          },
          android: {
            minSdkVersion: 24,
            targetSdkVersion: 35,
            compileSdkVersion: 35
          }
        }
      ],
      "expo-secure-store",
      "expo-camera",
      "expo-image-picker",
      "expo-media-library",
      "expo-localization",
      "expo-notifications",
      "expo-asset",
      [
        "expo-apple-authentication",
        {
          "appleTeamId": "73T7PB4F99"
        }
      ],
      "expo-dev-client",
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": `com.googleusercontent.apps.${(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '').replace('.apps.googleusercontent.com', '')}`
        }
      ]
    ]
  }
};
