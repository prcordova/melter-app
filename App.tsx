import React from 'react';
import { LogBox } from 'react-native';
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
import { AuthStackNavigator } from './src/navigation/AuthStackNavigator';
import { TabNavigator } from './src/navigation/TabNavigator';
import { View, Text, StyleSheet } from 'react-native';
import { usePermissions } from './src/hooks/usePermissions';
import { CustomToast } from './src/components/CustomToast';
import { BiometricUnlockModal } from './src/components/BiometricUnlockModal';
import { DEBUG_VERBOSE_LOGS } from './src/config/dev-logs';
import { initNotificationSoundPrefs } from './src/lib/notification-sounds';

const Stack = createNativeStackNavigator();

if (__DEV__ && DEBUG_VERBOSE_LOGS) {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GLOBAL JS ERROR]', isFatal ? 'FATAL' : 'non-fatal', error?.message, error?.stack);
    defaultHandler?.(error, isFatal);
  });
}

void initNotificationSoundPrefs();

if (__DEV__) {
  LogBox.ignoreLogs([
    'VirtualizedList:',
    'expo-notifications',
    'expo-av',
    'SafeAreaView has been deprecated',
  ]);
}

function Navigation() {
  const { user, loading, biometricUnlockRequired, clearBiometricUnlockRequirement, logout } = useAuth();
  usePermissions();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>Melter</Text>
        <View style={styles.loadingCard}>
          <View style={styles.loadingLinePrimary} />
          <View style={styles.loadingLineSecondary} />
        </View>
      </View>
    );
  }

  return (
    <DiscoveryPreferenceProvider>
      <Stack.Navigator>
        {user ? (
          <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStackNavigator} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>

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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
  },
  loadingLogo: {
    fontSize: 40,
    fontWeight: '700',
    color: '#d946ef',
    marginBottom: 18,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 260,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  loadingLinePrimary: {
    width: '75%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  loadingLineSecondary: {
    width: '55%',
    height: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
});
