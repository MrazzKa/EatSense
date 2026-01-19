// App.js - Main navigation structure
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { I18nProvider } from './app/i18n/provider';
import { ensureI18nReady } from './app/i18n/config';
import { AppWrapper } from './src/components/AppWrapper';
import { EmptySplash } from './src/components/EmptySplash';
import { useAuth } from './src/contexts/AuthContext';

// Import screens
import AuthScreen from './src/components/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import CameraScreen from './src/screens/CameraScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import AnalysisResultsScreen from './src/screens/AnalysisResultsScreen';
import ArticleDetailScreen from './src/screens/ArticleDetailScreen';
import LegalDocumentScreen from './src/screens/LegalDocumentScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import LegalMenuScreen from './src/screens/LegalMenuScreen';
import SuggestedFoodScreen from './src/screens/SuggestedFoodScreen';
import MedicationScheduleScreen from './src/screens/MedicationScheduleScreen';
import SpecialistListScreen from './src/screens/SpecialistListScreen';
import SpecialistProfileScreen from './src/screens/SpecialistProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import ConsultationsListScreen from './src/screens/ConsultationsListScreen';
import DietProgramsListScreen from './src/screens/DietProgramsListScreen';
import DietProgramDetailScreen from './src/screens/DietProgramDetailScreen';
import DietProgramProgressScreen from './src/screens/DietProgramProgressScreen';
import LifestyleDetailScreen from './src/screens/LifestyleDetailScreen';
import ReferralScreen from './src/screens/ReferralScreen';
import ExpertProfileScreen from './src/screens/ExpertProfileScreen';
import ConsultationChatScreen from './src/screens/ConsultationChatScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import { MainTabsNavigator } from './src/navigation/MainTabsNavigator';
import { clientLog } from './src/utils/clientLog';

const Stack = createStackNavigator();

function AppContent() {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;
  const needsOnboarding = isAuthenticated && !user?.isOnboardingCompleted;

  useEffect(() => {
    clientLog('RootNav:render', {
      isAuthenticated,
      needsOnboarding,
      userId: user?.id || 'none',
    }).catch(() => { });
  }, [isAuthenticated, needsOnboarding, user?.id]);

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
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </Stack.Navigator>
        ) : (
          // Authenticated and onboarding complete - show main app
          <Stack.Navigator
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
              name="Onboarding"
              component={OnboardingScreen}
              options={{
                presentation: 'modal',
              }}
            />
            {/* Experts Marketplace Screens */}
            <Stack.Screen
              name="SpecialistList"
              component={SpecialistListScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="SpecialistProfile"
              component={SpecialistProfileScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ presentation: 'card' }}
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
              name="ConsultationChat"
              component={ConsultationChatScreen}
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{ presentation: 'card' }}
            />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  React.useEffect(() => {
    clientLog('App:rootMounted').catch(() => { });

    ensureI18nReady().then(() => {
      setI18nReady(true);
    });
  }, []);

  // Блокируем рендер пока i18n не готов
  if (!i18nReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
