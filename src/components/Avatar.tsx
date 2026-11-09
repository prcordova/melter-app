import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useAppTheme } from '../contexts/ThemeContext';

interface AvatarProps {
  user: {
    username?: string;
    avatar?: string | null;
  };
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  disableNavigation?: boolean;
}

export function Avatar({
  user,
  size = 40,
  onPress,
  style,
  imageStyle,
  disableNavigation = false,
}: AvatarProps) {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const avatarUrl = getAvatarUrl(user.avatar);
  const initials = getUserInitials(user.username || '');

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (!disableNavigation && user.username) {
      // Navegação global para perfil
      navigation.navigate({
        name: 'UserProfile',
        params: { username: user.username },
        merge: false,
      } as never);
    }
  };

  const containerStyle = [
    styles.container,
    { width: size, height: size, borderRadius: size / 2 },
    style,
  ];

  const contentStyle = [
    { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background.tertiary },
    imageStyle,
  ];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disableNavigation && !onPress}
      activeOpacity={0.7}
      style={containerStyle}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={contentStyle}
        />
      ) : (
        <View style={[contentStyle, styles.placeholder, { backgroundColor: colors.secondary.main }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {initials}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

