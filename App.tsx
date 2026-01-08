import "react-native-css-interop/jsx-runtime";
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AuthStackNavigator } from './src/navigation/AuthStackNavigator';
import { TabNavigator } from './src/navigation/TabNavigator';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { usePermissions } from './src/hooks/usePermissions';
import { CustomToast } from './src/components/CustomToast';
import { usePushNotifications } from './src/hooks/usePushNotifications';

const Stack = createNativeStackNavigator();

function Navigation() {
  const { user, loading } = useAuth();
  const permissions = usePermissions();
  usePushNotifications(); // Registrar push notifications

  // Mostrar loading enquanto carrega auth ou permissões
  if (loading || permissions.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size="large" 
          color="#d946ef"
          animating={true}
        />
      </View>
    );
  }

         return (
           <Stack.Navigator>
             {user ? (
               <Stack.Screen 
                 name="Main" 
                 component={TabNavigator}
                 options={{ headerShown: false }}
               />
             ) : (
               <Stack.Screen 
                 name="Auth" 
                 component={AuthStackNavigator}
                 options={{ headerShown: false }}
               />
             )}
           </Stack.Navigator>
         );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <NavigationContainer>
              <Navigation />
              <StatusBar style="auto" />
              <CustomToast />
            </NavigationContainer>
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
  },
});
