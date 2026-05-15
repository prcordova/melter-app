import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LinksSettingsScreen } from '../screens/settings/LinksSettingsScreen';
import { AppearanceSettingsScreen } from '../screens/settings/AppearanceSettingsScreen';
import { WalletSettingsScreen } from '../screens/settings/WalletSettingsScreen';
import { PlansScreen } from '../screens/PlansScreen';
import { TermsScreen } from '../screens/TermsScreen';
import { MyShopScreen } from '../screens/MyShopScreen';
import { PurchasesScreen } from '../screens/PurchasesScreen';
import { ProductScreen } from '../screens/ProductScreen';
import { SettingsScreenTemplate } from '../components/SettingsScreenTemplate';
import { AnalyticsScreen } from '../screens/settings/AnalyticsScreen';
import { PromotionsScreen } from '../screens/settings/PromotionsScreen';
import { SecurityScreen } from '../screens/settings/SecurityScreen';
import { PrivacyScreen } from '../screens/settings/PrivacyScreen';
import { PreferencesScreen } from '../screens/settings/PreferencesScreen';
import { ReferralScreen } from '../screens/ReferralScreen';
import { AccountVerificationScreen } from '../screens/AccountVerificationScreen';
import { SupportTicketsScreen } from '../screens/SupportTicketsScreen';

const Stack = createNativeStackNavigator();




export function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="LinksSettings" component={LinksSettingsScreen} />
      <Stack.Screen name="Plans" component={PlansScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="AppearanceSettings" component={AppearanceSettingsScreen} />
      <Stack.Screen name="WalletSettings" component={WalletSettingsScreen} />
      <Stack.Screen name="PreferencesSettings" component={PreferencesScreen} />
      <Stack.Screen name="SecuritySettings" component={SecurityScreen} />
      <Stack.Screen name="PrivacitySettings" component={PrivacyScreen} />
      <Stack.Screen name="AnalyticsSettings" component={AnalyticsScreen} />
      <Stack.Screen name="PromotionsSettings" component={PromotionsScreen} />
      <Stack.Screen 
        name="MyShop" 
        component={MyShopScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Purchases" 
        component={PurchasesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Product" 
        component={ProductScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Referral" 
        component={ReferralScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AccountVerification"
        component={AccountVerificationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

