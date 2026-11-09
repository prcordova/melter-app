import React from 'react';
import { LogBox, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SellerJourneyProvider } from './src/contexts/SellerJourneyContext';
import { DiscoveryPreferenceProvider } from './src/contexts/DiscoveryPreferenceContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { UnreadMessagesProvider } from './src/contexts/UnreadMessagesContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AppUpdateProvider } from './src/contexts/AppUpdateContext';
import { ForceUpdateModal } from './src/components/ForceUpdateModal';
import { AppLoadingScreen } from './src/components/AppLoadingScreen';
import { AuthStackNavigator } from './src/navigation/AuthStackNavigator';
import { TabNavigator } from './src/navigation/TabNavigator';
import { usePermissions } from './src/hooks/usePermissions';
import { useAppUsageHeartbeat } from './src/hooks/useAppUsageHeartbeat';
import { useBiometricAutoLock } from './src/hooks/useBiometricAutoLock';
import { useAppPrivacyProtection } from './src/hooks/useAppPrivacyProtection';
import { CustomToast } from './src/components/CustomToast';
import { BiometricUnlockModal } from './src/components/BiometricUnlockModal';
import { AppPrivacyCover } from './src/components/security/AppPrivacyCover';
import { DEBUG_VERBOSE_LOGS } from './src/config/dev-logs';
import { initNotificationSoundPrefs } from './src/lib/notification-sounds';
import { getBiometricLoginEnabled } from './src/services/biometricLogin';
import {
  ensureBiometricHideContentLoaded,
  ensureBiometricLockTimeoutLoaded,
} from './src/lib/biometric-lock';

const Stack = createNativeStackNavigator();

if (__DEV__ && DEBUG_VERBOSE_LOGS) {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GLOBAL JS ERROR]', isFatal ? 'FATAL' : 'non-fatal', error?.message, error?.stack);
    defaultHandler?.(error, isFatal);
  });
}

void initNotificationSoundPrefs();
void ensureBiometricLockTimeoutLoaded();
void ensureBiometricHideContentLoaded();
void getBiometricLoginEnabled().catch(() => false);

if (__DEV__) {
  LogBox.ignoreLogs([
    'VirtualizedList:',
    'expo-notifications',
    'SafeAreaView has been deprecated',
  ]);
}

function Navigation() {
  const {
    user,
    loading,
    biometricUnlockRequired,
    clearBiometricUnlockRequirement,
    requireBiometricUnlock,
    logout,
  } = useAuth();
  usePermissions();
  useAppUsageHeartbeat(user?.id);
  const { markActivity, privacyCoverVisible } = useBiometricAutoLock(
    Boolean(user) && !biometricUnlockRequired,
    requireBiometricUnlock
  );
  useAppPrivacyProtection(Boolean(user));

  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <DiscoveryPreferenceProvider>
      <View
        style={{ flex: 1 }}
        onStartShouldSetResponderCapture={() => {
          markActivity();
          return false;
        }}
      >
      <Stack.Navigator>
        {user ? (
          <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStackNavigator} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
      {privacyCoverVisible ? <AppPrivacyCover /> : null}
      </View>

      <BiometricUnlockModal
        visible={Boolean(user && biometricUnlockRequired)}
        onUnlocked={clearBiometricUnlockRequirement}
        onLogout={logout}
      />
    </DiscoveryPreferenceProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
        <AppUpdateProvider>
        <AuthProvider>
          <NotificationProvider>
            <UnreadMessagesProvider>
              <SellerJourneyProvider>
              <NavigationContainer>
                <Navigation />
                <StatusBar style="auto" />
                <CustomToast />
              </NavigationContainer>
              </SellerJourneyProvider>
            </UnreadMessagesProvider>
          </NotificationProvider>
        </AuthProvider>
        <ForceUpdateModal />
        </AppUpdateProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
