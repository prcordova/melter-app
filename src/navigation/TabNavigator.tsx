import React from 'react';
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
import { COLORS } from '../theme/colors';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  usePushNotifications();
  const { unreadCount: unreadMessagesCount, refreshUnreadCount } = useUnreadMessages();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.secondary.main, // #B63385 - Rosa Melter (ativo)
        tabBarInactiveTintColor: COLORS.text.tertiary, // #6b7280 - Cinza (inativo)
        tabBarStyle: {
          backgroundColor: COLORS.background.paper, // #ffffff
          borderTopWidth: 1,
          borderTopColor: COLORS.border.light, // #f1f5f9
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom || 8,
          paddingTop: 8,
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ShopsTab"
        component={ShopsSearchScreen}
        options={{
          tabBarLabel: 'Lojas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
             <Tab.Screen
               name="CommunityStack"
               component={CommunityStackNavigator}
               options={{
                 tabBarLabel: 'Comunidade',
                 tabBarIcon: ({ color, size }) => (
                   <Ionicons name="people" size={size} color={color} />
                 ),
               }}
             />
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Força sempre abrir o início da stack de perfil,
            // evitando estados presos quando vindo da tab de lojas.
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
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: COLORS.states.error, // Vermelho
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.paper, // Branco
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

