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
import { SettingsScreenTemplate } from '../components/SettingsScreenTemplate';
import { Text } from 'react-native';

const Stack = createNativeStackNavigator();

function PreferencesSettingsScreen() {
  return (
    <SettingsScreenTemplate title="Preferências" emoji="⚙️">
      <Text>Preferências de categorias, notificações, etc.</Text>
    </SettingsScreenTemplate>
  );
}

function SecuritySettingsScreen() {
  return (
    <SettingsScreenTemplate title="Segurança" emoji="🔒">
      <Text>Senha, 2FA, sessões ativas, etc.</Text>
    </SettingsScreenTemplate>
  );
}

function PrivacitySettingsScreen() {
  return (
    <SettingsScreenTemplate title="Privacidade" emoji="👁️">
      <Text>Bloqueados, visibilidade, etc.</Text>
    </SettingsScreenTemplate>
  );
}

function AnalyticsSettingsScreen() {
  return (
    <SettingsScreenTemplate title="Análises" emoji="📊">
      <Text>Estatísticas de perfil, engajamento, etc.</Text>
    </SettingsScreenTemplate>
  );
}

function PromotionsSettingsScreen() {
  return (
    <SettingsScreenTemplate title="Promoções" emoji="🎁">
      <Text>Criar e gerenciar promoções</Text>
    </SettingsScreenTemplate>
  );
}

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
      <Stack.Screen name="PreferencesSettings" component={PreferencesSettingsScreen} />
      <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
      <Stack.Screen name="PrivacitySettings" component={PrivacitySettingsScreen} />
      <Stack.Screen name="AnalyticsSettings" component={AnalyticsSettingsScreen} />
      <Stack.Screen name="PromotionsSettings" component={PromotionsSettingsScreen} />
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
    </Stack.Navigator>
  );
}

