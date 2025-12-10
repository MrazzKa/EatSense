// App.js - Main navigation structure
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { I18nProvider } from './app/i18n/provider';
import { AppWrapper } from './src/components/AppWrapper';
import { EmptySplash } from './src/components/EmptySplash';
import { useAuth } from './src/contexts/AuthContext';

// Import screens
import SmokeTestScreen from './src/screens/SmokeTestScreen';
import AuthScreen from './src/components/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import CameraScreen from './src/screens/CameraScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import AnalysisResultsScreen from './src/screens/AnalysisResultsScreen';
import ArticleDetailScreen from './src/screens/ArticleDetailScreen';
import LegalDocumentScreen from './src/screens/LegalDocumentScreen';
import SuggestedFoodScreen from './src/screens/SuggestedFoodScreen';
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
    }).catch(() => {});
  }, [isAuthenticated, needsOnboarding, user?.id]);
  
  // Show loading/splash while checking auth
  if (loading) {
    return <EmptySplash />;
  }

  const handleAuthSuccess = async () => {
    await clientLog('App:authSuccess').catch(() => {});
    // Navigation будет обработан внутри AuthScreen
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer
        onReady={() => {
          clientLog('App:navigationReady').catch(() => {});
        }}
        onStateChange={(state) => {
          const currentRoute = state?.routes?.[state.index]?.name;
          if (currentRoute) {
            clientLog('App:navigationStateChange', { 
              route: currentRoute, 
              isAuthenticated,
              needsOnboarding,
            }).catch(() => {});
          }
        }}
      >
        {!isAuthenticated ? (
          // Not authenticated - show Auth screen
          <Stack.Navigator
            initialRouteName={__DEV__ ? "_SmokeTest" : "Auth"}
            screenOptions={{
              headerShown: false,
            }}
          >
            {__DEV__ && (
              <Stack.Screen name="_SmokeTest" component={SmokeTestScreen} />
            )}
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
              name="SuggestedFood"
              component={SuggestedFoodScreen}
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{
                presentation: 'modal',
              }}
            />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  React.useEffect(() => {
    clientLog('App:rootMounted').catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <I18nProvider fallback={<EmptySplash />}>
        <AppWrapper>
          <AppContent />
        </AppWrapper>
      </I18nProvider>
    </ErrorBoundary>
  );
}
