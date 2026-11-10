import React from 'react';
import { View, Image, StyleSheet, type StyleProp, type ImageStyle, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppVideo } from '../AppVideo';
import { getImageUrl } from '../../utils/image';
import { useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';

type Props = {
  /** JPEG assinado (preferencial). */
  thumbnail?: string | null;
  /** URL assinada do vídeo — fallback de preview (igual web `<video preload=metadata>`). */
  videoUrl?: string | null;
  style?: StyleProp<ImageStyle | ViewStyle>;
  showPlayOverlay?: boolean;
};

/**
 * Preview do card de vídeo no produto: thumbnail JPEG se existir;
 * senão frame do player pausado (vídeos antigos sem `thumbnail` no banco).
 */
export function ProductVideoThumb({
  thumbnail,
  videoUrl,
  style,
  showPlayOverlay = true,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const thumbUri = getImageUrl(thumbnail) || (thumbnail?.startsWith('http') ? thumbnail : undefined);
  const mediaUri = getImageUrl(videoUrl) || (videoUrl?.startsWith('http') ? videoUrl : undefined);

  return (
    <View style={[styles.wrap, style]}>
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={styles.fill} resizeMode="cover" />
      ) : mediaUri ? (
        <AppVideo
          uri={mediaUri}
          style={styles.fill}
          contentFit="cover"
          muted
          paused
          nativeControls={false}
          startTime={0.15}
        />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="videocam-outline" size={32} color="#9ca3af" />
        </View>
      )}
      {showPlayOverlay ? (
        <View style={styles.playOverlay} pointerEvents="none">
          <Ionicons name="play-circle" size={48} color="#ffffff" />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (_c: AppPalette) =>
  StyleSheet.create({
    wrap: {
      width: '100%',
      height: 120,
      backgroundColor: '#000',
      overflow: 'hidden',
      position: 'relative',
    },
    fill: {
      ...StyleSheet.absoluteFill,
      width: '100%',
      height: '100%',
    },
    placeholder: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1f2937',
    },
    playOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.28)',
    },
  });
