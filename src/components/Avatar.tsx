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
import { COLORS } from '../theme/colors';

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
    styles.avatar,
    { width: size, height: size, borderRadius: size / 2 },
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
        <View style={[contentStyle, styles.placeholder]}>
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
  avatar: {
    backgroundColor: COLORS.background.tertiary,
  },
  placeholder: {
    backgroundColor: COLORS.secondary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

