import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { COLORS } from '../theme/colors';

interface EditableAvatarProps {
  src: string | null;
  username?: string;
  size?: number;
  planType?: 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
  borderColor?: string;
  editable?: boolean;
  onAvatarChange?: (fileUri: string) => Promise<void>;
  isLoading?: boolean;
}

const PLAN_BORDERS = {
  FREE: 'transparent',
  STARTER: '#0ea5e9',
  PRO: '#FFD700',
  PRO_PLUS: '#9333ea',
};

export function EditableAvatar({
  src,
  username = '',
  size = 96,
  planType = 'FREE',
  borderColor,
  editable = false,
  onAvatarChange,
  isLoading = false,
}: EditableAvatarProps) {
  const getBorderColor = () => {
    if (planType === 'PRO' || planType === 'PRO_PLUS') {
      return borderColor || PLAN_BORDERS[planType];
    }
    return PLAN_BORDERS[planType];
  };

  const handleImagePicker = async () => {
    if (!editable || !onAvatarChange) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0] && result.assets[0].uri) {
        await onAvatarChange(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
    }
  };

  const avatarUrl = src ? getAvatarUrl(src) : null;
  const initials = getUserInitials(username);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: planType !== 'FREE' ? 3 : 0,
            borderColor: getBorderColor(),
          },
        ]}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[
              styles.avatarImage,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                {
                  fontSize: size * 0.4,
                },
              ]}
            >
              {initials}
            </Text>
          </View>
        )}
      </View>

      {editable && (
        <TouchableOpacity
          style={[
            styles.editButton,
            {
              width: size * 0.35,
              height: size * 0.35,
              borderRadius: (size * 0.35) / 2,
              bottom: 0,
              right: 0,
            },
          ]}
          onPress={handleImagePicker}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="camera" size={size * 0.2} color="#ffffff" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: COLORS.secondary.main,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.secondary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  editButton: {
    position: 'absolute',
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
});

