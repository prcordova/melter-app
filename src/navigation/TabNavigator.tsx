import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { FeedScreen } from '../screens/FeedScreen';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import { MessagesStackNavigator } from './MessagesStackNavigator';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { FollowListScreen } from '../screens/FollowListScreen';
import { ShopsSearchScreen } from '../screens/ShopsSearchScreen';
import { CommunityStackNavigator } from './CommunityStackNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import { useDiscoveryPreference } from '../contexts/DiscoveryPreferenceContext';
import { TermsGuard } from '../components/TermsGuard';
import { SellerJourneyFabOverlay } from '../components/seller-journey/SellerJourneyFabOverlay';
import { OnboardingTourGate } from '../components/OnboardingTourGate';
import type { DiscoveryViewMode } from '../utils/explorer-discovery-personalization';

const Tab = createBottomTabNavigator();

const TAB_BAR_PADDING_TOP = 8;

type DiscoveryTabIcon = 'storefront' | 'people';

type DiscoveryTabConfig = {
  mode: DiscoveryViewMode;
  name: string;
  component: React.ComponentType;
  label: string;
  icon: DiscoveryTabIcon;
};

const DISCOVERY_TAB_CONFIG: Record<DiscoveryViewMode, Omit<DiscoveryTabConfig, 'mode'>> = {
  shops: {
    name: 'ShopsTab',
    component: ShopsSearchScreen,
    label: 'Lojas',
    icon: 'storefront',
  },
  users: {
    name: 'CommunityStack',
    component: CommunityStackNavigator,
    label: 'Comunidade',
    icon: 'people',
  },
};

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  usePushNotifications();
  const { unreadCount: unreadMessagesCount, refreshUnreadCount } = useUnreadMessages();
  const { preference } = useDiscoveryPreference();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  const orderedDiscoveryTabs = useMemo((): DiscoveryTabConfig[] => {
    return preference.modeButtonOrder.map((mode) => ({
      mode,
      ...DISCOVERY_TAB_CONFIG[mode],
    }));
  }, [preference.modeButtonOrder]);

  const visibleTabs = useMemo(
    () => ['FeedTab', ...orderedDiscoveryTabs.map((tab) => tab.name), 'MessagesStack', 'ProfileStack'],
    [orderedDiscoveryTabs]
  );
  const tabBarHeight = 60 + insets.bottom;
  const tabBarPaddingBottom = insets.bottom || 8;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.icon.active,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.background.appbar,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: TAB_BAR_PADDING_TOP,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />

      {orderedDiscoveryTabs.map(({ mode, name, component, label, icon }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} />,
          }}
        />
      ))}

      <Tab.Screen
        name="MessagesStack"
        component={MessagesStackNavigator}
        options={{
          tabBarLabel: 'Mensagens',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubbles" size={size} color={color} />
              {unreadMessagesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: () => {
            refreshUnreadCount();
          },
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const tabState = navigation.getState();
            const profileTab = tabState.routes.find((r) => r.name === 'ProfileStack');
            const stackState = profileTab?.state as
              | { index?: number; routes?: { name: string }[] }
              | undefined;
            const innerRoute =
              stackState?.routes?.[stackState.index ?? 0]?.name ?? 'ProfileMain';

            if (innerRoute === 'ProfileMain') {
              return;
            }

            e.preventDefault();
            navigation.navigate('ProfileStack', {
              screen: 'ProfileMain',
            });
          },
        })}
      />
      <Tab.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="FollowList"
        component={FollowListScreen}
        options={{
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
    <SellerJourneyFabOverlay />
    <TermsGuard />
    <OnboardingTourGate
      visibleTabs={visibleTabs}
      tabBarHeight={tabBarHeight}
      tabBarPaddingTop={TAB_BAR_PADDING_TOP}
      tabBarPaddingBottom={tabBarPaddingBottom}
    />
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    iconContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -6,
      right: -10,
      backgroundColor: c.states.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.background.appbar,
    },
    badgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
  });
