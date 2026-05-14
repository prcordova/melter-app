import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommunityScreen } from '../screens/CommunityScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { FollowListScreen } from '../screens/FollowListScreen';

export type CommunityStackParamList = {
  Community: undefined;
  CommunityUserProfile: {
    username: string;
  };
  FollowList: {
    username: string;
    list: 'followers' | 'following';
  };
};

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export function CommunityStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Community" component={CommunityScreen} />
      <Stack.Screen name="CommunityUserProfile" component={UserProfileScreen} />
      <Stack.Screen name="FollowList" component={FollowListScreen} />
    </Stack.Navigator>
  );
}

