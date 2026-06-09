// @ts-nocheck
// App.js - Main navigation structure
import React, { useEffect, useState } from 'react';
import { DefaultTheme, NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Register WebRTC + crypto globals required by LiveKit before any LiveKit code
// runs. Must be top-level so it executes before VideoCallScreen mounts.
import { registerGlobals as registerLiveKitGlobals } from '@livekit/react-native';
registerLiveKitGlobals();
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { I18nProvider } from './app/i18n/provider';
import { ensureI18nReady } from './app/i18n/config';
import { AppWrapper } from './src/components/AppWrapper';
import { EmptySplash } from './src/components/EmptySplash';
import { useAuth } from './src/contexts/AuthContext';
import { useTheme } from './src/contexts/ThemeContext';
import { useNotificationActions, setNotificationNavigationCallback } from './src/hooks/useNotificationActions';

// FIX: Lazy load screens to improve app startup time
// Only load screens when they're actually needed, not at app startup
import AuthScreen from './src/components/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { MainTabsNavigator } from './src/navigation/MainTabsNavigator';

// Lazy load all other screens - they'll be loaded only when navigated to
import { Suspense } from 'react';

// Wrapper to prevent "undefined is not a function" and suspense crashes
const withSuspense = (Component) => {
  const WrappedWithSuspense = (props) => (
    <Suspense fallback={<EmptySplash />}>
      <Component {...props} />
    </Suspense>
  );

  WrappedWithSuspense.displayName = `withSuspense(${Component.displayName || Component.name || 'LazyScreen'})`;
  return WrappedWithSuspense;
};

const CameraScreen = withSuspense(React.lazy(() => import('./src/screens/CameraScreen')));
const GalleryScreen = withSuspense(React.lazy(() => import('./src/screens/GalleryScreen')));
const AnalysisResultsScreen = withSuspense(React.lazy(() => import('./src/screens/AnalysisResultsScreen')));
const ArticleDetailScreen = withSuspense(React.lazy(() => import('./src/screens/ArticleDetailScreen')));
const LegalDocumentScreen = withSuspense(React.lazy(() => import('./src/screens/LegalDocumentScreen')));
const PrivacyPolicyScreen = withSuspense(React.lazy(() => import('./src/screens/PrivacyPolicyScreen')));
const TermsOfServiceScreen = withSuspense(React.lazy(() => import('./src/screens/TermsOfServiceScreen')));
const LegalMenuScreen = withSuspense(React.lazy(() => import('./src/screens/LegalMenuScreen')));
const SuggestedFoodScreen = withSuspense(React.lazy(() => import('./src/screens/SuggestedFoodScreen')));
const MedicationScheduleScreen = withSuspense(React.lazy(() => import('./src/screens/MedicationScheduleScreen')));
const ChatScreen = withSuspense(React.lazy(() => import('./src/screens/ChatScreen')));
const VideoCallScreen = withSuspense(React.lazy(() => import('./src/screens/VideoCallScreen')));
const ConsultationsListScreen = withSuspense(React.lazy(() => import('./src/screens/ConsultationsListScreen')));
const DietProgramsListScreen = withSuspense(React.lazy(() => import('./src/screens/DietProgramsListScreen')));
const DietProgramDetailScreen = withSuspense(React.lazy(() => import('./src/screens/DietProgramDetailScreen')));
const DietProgramProgressScreen = withSuspense(React.lazy(() => import('./src/screens/DietProgramProgressScreen')));
const LifestyleDetailScreen = withSuspense(React.lazy(() => import('./src/screens/LifestyleDetailScreen')));
const ReferralScreen = withSuspense(React.lazy(() => import('./src/screens/ReferralScreen')));
const ExpertProfileScreen = withSuspense(React.lazy(() => import('./src/screens/ExpertProfileScreen')));
const ScheduleConsultationScreen = withSuspense(React.lazy(() => import('./src/screens/ScheduleConsultationScreen')));
const BecomeExpertScreen = withSuspense(React.lazy(() => import('./src/screens/expert/BecomeExpertScreen')));
const SubscriptionScreen = withSuspense(React.lazy(() => import('./src/screens/SubscriptionScreen')));
const MealHistoryScreen = withSuspense(React.lazy(() => import('./src/screens/MealHistoryScreen')));
const DiaryJournalScreen = withSuspense(React.lazy(() => import('./src/screens/DiaryJournalScreen')));
const ScientificSourcesScreen = withSuspense(React.lazy(() => import('./src/screens/ScientificSourcesScreen')));
const ReportsScreen = withSuspense(React.lazy(() => import('./src/screens/ReportsScreen')));
const BestPlacesScreen = withSuspense(React.lazy(() => import('./src/screens/BestPlacesScreen')));
const PharmacyScreen = withSuspense(React.lazy(() => import('./src/screens/PharmacyScreen')));
const ProfileScreen = withSuspense(React.lazy(() => import('./src/screens/ProfileScreen')));
const HealthScreen = withSuspense(React.lazy(() => import('./src/screens/HealthScreen')));
const HelpScreen = withSuspense(React.lazy(() => import('./src/screens/HelpScreen')));
const CommunityGroupScreen = withSuspense(React.lazy(() => import('./src/screens/CommunityGroupScreen')));
const CommunityPostDetailScreen = withSuspense(React.lazy(() => import('./src/screens/CommunityPostDetailScreen')));
const CreateCommunityPostScreen = withSuspense(React.lazy(() => import('./src/screens/CreateCommunityPostScreen')));
const CreateCommunityGroupScreen = withSuspense(React.lazy(() => import('./src/screens/CreateCommunityGroupScreen')));
const CitySelectorScreen = withSuspense(React.lazy(() => import('./src/screens/CitySelectorScreen')));
const MascotSetupScreen = withSuspense(React.lazy(() => import('./src/screens/MascotSetupScreen')));
const CommunityGuidelinesScreen = withSuspense(React.lazy(() => import('./src/screens/CommunityGuidelinesScreen')));

import { clientLog } from './src/utils/clientLog';

const Stack = createStackNavigator();

// Component to set up notification action handlers with navigation
function NotificationActionsHandler() {
  const navigation = useNavigation();

  // Set up notification actions hook
  useNotificationActions();

  // Register navigation callback for notification actions
  useEffect(() => {
    setNotificationNavigationCallback((screen, params) => {
      if (params) {
        navigation.navigate(screen, params);
      } else {
        navigation.navigate(screen);
      }
    });

    return () => {
      setNotificationNavigationCallback(null);
    };
  }, [navigation]);

  return null;
}

function AppContent() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const isAuthenticated = !!user;
  const needsOnboarding = isAuthenticated && !user?.isOnboardingCompleted;
  const navigationTheme = React.useMemo(() => ({
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background || '#F4F5F7',
      card: colors.background || '#F4F5F7',
      text: colors.text || DefaultTheme.colors.text,
      border: colors.border || DefaultTheme.colors.border,
      primary: colors.primary || DefaultTheme.colors.primary,
    },
  }), [colors]);

  useEffect(() => {
    clientLog('RootNav:render', {
      isAuthenticated,
      needsOnboarding,
      userId: user?.id || 'none',
    }).catch(() => { });
  }, [isAuthenticated, needsOnboarding, user?.id]);

  // One-shot cleanup of orphaned meal-reminder notifications at app start.
  // Users complained about spam at 9/13/19 even with the toggle off — old
  // builds scheduled them automatically. Sync schedule with server preference.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const ApiService = require('./src/services/apiService').default;
        const { localNotificationService } = require('./src/services/localNotificationService');
        const prefs = await ApiService.getNotificationPreferences().catch(() => null);
        if (cancelled) return;
        const enabled = !!prefs?.dailyPushEnabled;
        if (!enabled) {
          await localNotificationService.cancelNotificationsByCategory('meal_reminder');
        }
      } catch (error) {
        clientLog('Notifications:mealReminderCleanupFailed', {
          error: String(error),
        }).catch(() => { });
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  // Show loading/splash while checking auth
  if (loading) {
    return <EmptySplash />;
  }

  const handleAuthSuccess = async () => {
    await clientLog('App:authSuccess').catch(() => { });
    // Navigation будет обработан внутри AuthScreen
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={navigationTheme}
        onReady={() => {
          clientLog('App:navigationReady').catch(() => { });
        }}
        onStateChange={(state) => {
          const currentRoute = state?.routes?.[state.index]?.name;
          if (currentRoute) {
            clientLog('App:navigationStateChange', {
              route: currentRoute,
              isAuthenticated,
              needsOnboarding,
            }).catch(() => { });
          }
        }}
      >
        {!isAuthenticated ? (
          // Not authenticated - show Auth screen
          <Stack.Navigator
            key="auth-stack"
            initialRouteName="Auth"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Auth">
              {(props) => <AuthScreen {...props} onAuthSuccess={handleAuthSuccess} />}
            </Stack.Screen>
          </Stack.Navigator>
        ) : needsOnboarding ? (
          // Authenticated but needs onboarding
          <Stack.Navigator
            key="onboarding-stack"
            initialRouteName="Onboarding"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{ presentation: 'card' }}
            />
            {/* Legal screens must also be registered here — the onboarding
                Terms & Privacy step links to them before the main stack exists. */}
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ presentation: 'card', headerShown: false }}
            />
            <Stack.Screen
              name="TermsOfService"
              component={TermsOfServiceScreen}
              options={{ presentation: 'card', headerShown: false }}
            />
          </Stack.Navigator>
        ) : (
          // Authenticated and onboarding complete - show main app
          <>
            {/* Notification action handlers - must be inside NavigationContainer */}
            <NotificationActionsHandler />
            <Stack.Navigator
              key="main-stack"
              initialRouteName="MainTabs"
              screenOptions={{
                headerShown: false,
                presentation: 'card',
              }}
            >
              {/* Main Bottom Tab Navigator */}
              <Stack.Screen
                name="MainTabs"
                component={MainTabsNavigator}
                options={{
                  headerShown: false,
                }}
              />

              {/* Modal/Detail Screens */}
              <Stack.Screen
                name="Camera"
                component={CameraScreen}
                options={{
                  presentation: 'fullScreenModal',
                  animationTypeForReplace: 'push',
                }}
              />
              <Stack.Screen
                name="Gallery"
                component={GalleryScreen}
                options={{
                  presentation: 'fullScreenModal',
                  animationTypeForReplace: 'push',
                }}
              />
              <Stack.Screen
                name="AnalysisResults"
                component={AnalysisResultsScreen}
                options={{
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="MealHistory"
                component={MealHistoryScreen}
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="DiaryJournal"
                component={DiaryJournalScreen}
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ArticleDetail"
                component={ArticleDetailScreen}
                options={{
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="LegalDocument"
                component={LegalDocumentScreen}
                options={{
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="LegalMenu"
                component={LegalMenuScreen}
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ScientificSources"
                component={ScientificSourcesScreen}
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="TermsOfService"
                component={TermsOfServiceScreen}
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="SuggestedFood"
                component={SuggestedFoodScreen}
                options={{
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="MedicationSchedule"
                component={MedicationScheduleScreen}
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Pharmacy"
                component={PharmacyScreen}
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Help"
                component={HelpScreen}
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              {/* Experts Marketplace Screens */}
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="VideoCall"
                component={VideoCallScreen}
                options={{ presentation: 'modal', headerShown: false, gestureEnabled: false }}
              />
              <Stack.Screen
                name="ConsultationsList"
                component={ConsultationsListScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="DietProgramsList"
                component={DietProgramsListScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="DietProgramDetail"
                component={DietProgramDetailScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="DietProgramProgress"
                component={DietProgramProgressScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="LifestyleDetail"
                component={LifestyleDetailScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="Referral"
                component={ReferralScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="ExpertProfile"
                component={ExpertProfileScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="ScheduleConsultation"
                component={ScheduleConsultationScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="BecomeExpert"
                component={BecomeExpertScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="Subscription"
                component={SubscriptionScreen}
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="Reports"
                component={ReportsScreen}
                options={{ presentation: 'card', headerShown: false }}
              />
              <Stack.Screen
                name="BestPlaces"
                component={BestPlacesScreen}
                options={{ presentation: 'card', headerShown: false }}
              />
              {/* Profile (moved from tabs to stack) */}
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ presentation: 'card', headerShown: false }}
              />
              <Stack.Screen
                name="Health"
                component={HealthScreen}
                options={{ presentation: 'card', headerShown: false }}
              />
              {/* Community Screens */}
              <Stack.Screen
                name="CommunityGroup"
                component={CommunityGroupScreen}
                options={{ presentation: 'card', headerShown: false }}
              />
              <Stack.Screen
                name="CommunityPostDetail"
                component={CommunityPostDetailScreen}
                options={{ presentation: 'card', headerShown: false }}
              />
              <Stack.Screen
                name="CreateCommunityPost"
                component={CreateCommunityPostScreen}
                options={{ presentation: 'card', headerShown: false, gestureEnabled: true }}
              />
              <Stack.Screen
                name="CreateCommunityGroup"
                component={CreateCommunityGroupScreen}
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="CitySelector"
                component={CitySelectorScreen}
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="MascotSetup"
                component={MascotSetupScreen}
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="CommunityGuidelines"
                component={CommunityGuidelinesScreen}
                options={{ presentation: 'card', headerShown: false }}
              />
            </Stack.Navigator>
          </>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  React.useEffect(() => {
    clientLog('App:rootMounted').catch(() => { });

    // FIX: Don't block render - initialize i18n in background
    // Show UI immediately, i18n will be ready by the time user interacts
    ensureI18nReady().then(() => {
      setI18nReady(true);
    }).catch((error) => {
      console.error('[App] i18n initialization failed:', error);
      // Still set ready to prevent infinite loading
      setI18nReady(true);
    });
  }, []);

  // FIX: Show UI immediately instead of blocking on i18n
  // i18n will be ready by the time user needs translations
  // This significantly improves perceived startup time
  if (!i18nReady) {
    // Show splash/loading screen while i18n initializes (non-blocking)
    return <EmptySplash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F4F5F7' }}>
      <ErrorBoundary>
        <I18nProvider fallback={<EmptySplash />}>
          <AppWrapper>
            <AppContent />
          </AppWrapper>
        </I18nProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
