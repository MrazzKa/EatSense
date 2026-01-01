// ============================================================
// ДОБАВИТЬ В App.js
// ============================================================

// 1. Добавить импорты после строки 26 (после MedicationScheduleScreen):

import SpecialistListScreen from './src/screens/SpecialistListScreen';
import SpecialistProfileScreen from './src/screens/SpecialistProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import ConsultationsListScreen from './src/screens/ConsultationsListScreen';
import DietProgramsListScreen from './src/screens/DietProgramsListScreen';
import DietProgramDetailScreen from './src/screens/DietProgramDetailScreen';
import DietProgramProgressScreen from './src/screens/DietProgramProgressScreen';
import ReferralScreen from './src/screens/ReferralScreen';

// 2. Добавить экраны в Stack.Navigator после MedicationSchedule (после строки 179):

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
              name="Referral"
              component={ReferralScreen}
              options={{ presentation: 'card' }}
            />
