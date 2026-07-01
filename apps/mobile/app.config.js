// Expo SDK 55 with RN 0.83.2 + React 19.2 - expo-dev-client is compatible
export default {
  expo: {
    name: "EatSense",
    slug: "eatsense",
    owner: "eatsense",
    version: "2.0.68",
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
      buildNumber: "86",
      developmentTeam: "73T7PB4F99",
      supportsTablet: false,
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
        // Microphone required for video consultations with experts (LiveKit).
        NSMicrophoneUsageDescription:
          "EatSense uses your microphone for video consultations with your nutritionist or dietitian.",
        // NSHealthShareUsageDescription — REMOVED (HealthKit not used in v1.0, planned for Q1 2026)
        // NSHealthUpdateUsageDescription — REMOVED (HealthKit not used in v1.0, planned for Q1 2026)
        // NSFaceIDUsageDescription — REMOVED (not used, Apple rejects unused permissions)
      },
      // Universal Links host is www.eatsense.ch — that is where the Cloudflare site
      // (and the static /.well-known/apple-app-site-association) actually lives. The
      // apex eatsense.ch only 301-redirects to www, and iOS does NOT follow redirects
      // when fetching the AASA, so the host here must be www. The wildcard also covers
      // api.eatsense.ch (its own AASA for /v1/auth paths). NOTE: ch.eatsense.app below
      // and elsewhere is the reverse-DNS BUNDLE ID, not a domain — leave it as-is.
      associatedDomains: ["applinks:www.eatsense.ch", "applinks:*.eatsense.ch"],
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
      versionCode: 122,
      // Adaptive icon uses the purpose-built foreground (no wordmark, content
      // inside the safe zone) so Android's circular/squircle launcher masks
      // don't clip the "EatSense" text that lives in Logo.jpg. Background matches
      // the navy of the artwork so any mask shape blends seamlessly.
      adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#1F2C5C" },
      // react-native-maps on Android requires a Google Maps API key. iOS uses
      // Apple Maps (PROVIDER_DEFAULT) and needs no key. Provide the key via
      // EXPO_PUBLIC_GOOGLE_MAPS_API_KEY before the next Android build; without
      // it the map renders blank on Android only.
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      },
      permissions: ["CAMERA", "RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS", "READ_MEDIA_IMAGES", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "POST_NOTIFICATIONS"],
      intentFilters: [{
        action: "VIEW",
        autoVerify: true,
        data: [
          // Pharmacy QR / share links open the app directly (PharmacyDeepLinkHandler).
          // Host is www.eatsense.ch (the apex only redirects to www).
          { scheme: "https", host: "www.eatsense.ch", pathPrefix: "/pharmacy" },
          { scheme: "https", host: "www.eatsense.ch", pathPrefix: "/v1/auth/magic/consume" },
          { scheme: "https", host: "www.eatsense.ch", pathPrefix: "/auth/google/callback" },
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
            deploymentTarget: "15.1",
            // GoogleSignIn → AppCheckCore (Swift) depends on GoogleUtilities and
            // RecaptchaInterop, whose newer versions stopped defining modules, so
            // `pod install` fails to integrate them as static libraries. Declaring
            // them with modular_headers generates the module maps AppCheckCore needs.
            extraPods: [
              { name: "GoogleUtilities", modular_headers: true },
              { name: "RecaptchaInterop", modular_headers: true }
            ]
          },
          android: {
            minSdkVersion: 24,
            targetSdkVersion: 35,
            // androidx 1.11/1.17 (pulled by RN 0.83 deps) require compiling against
            // API 36; build-tools 36 is already on the EAS image.
            compileSdkVersion: 36
          }
        }
      ],
      "expo-font",
      "expo-web-browser",
      "expo-secure-store",
      "expo-camera",
      "@livekit/react-native-expo-plugin",
      "@config-plugins/react-native-webrtc",
      "expo-image-picker",
      "expo-media-library",
      "expo-localization",
      "expo-location",
      "expo-video",
      "expo-notifications",
      "expo-asset",
      // react-native-iap ships amazon/play product flavors; Gradle 9 refuses to
      // auto-pick, so we declare the 'store' dimension as 'play'. See plugin file.
      "./plugins/withIapStoreFlavor",
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
