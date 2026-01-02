import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchHomeScreen } from '../screens/SearchHomeScreen';
import { UsersSearchScreen } from '../screens/UsersSearchScreen';

export type SearchStackParamList = {
  SearchHome: undefined;
  SearchUsers: undefined;
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SearchHome" component={SearchHomeScreen} />
      <Stack.Screen name="SearchUsers" component={UsersSearchScreen} />
    </Stack.Navigator>
  );
}

