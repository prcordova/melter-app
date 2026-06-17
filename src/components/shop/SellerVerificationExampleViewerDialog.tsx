import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { getImageUrl } from '../../utils/image';
import type { SellerVerificationExampleMedia } from '../../config/shops/seller-verification.config';

type Props = {
  example: SellerVerificationExampleMedia | null;
  onClose: () => void;
};

export function SellerVerificationExampleViewerDialog({ example, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const visible = Boolean(example);
  const mediaUrl = example ? getImageUrl(example.url) ?? example.url : undefined
  const isVideo = example?.mediaKind === 'video';
  const cardWidth = Math.min(width - 24, 720);
  const mediaMaxHeight = Math.min(height * 0.78, 680);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { width: cardWidth, maxHeight: height * 0.92 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={2}>
            {example?.title}
          </Text>
          <View style={styles.body}>
            {mediaUrl ? (
              isVideo ? (
                <Video
                  source={{ uri: mediaUrl }}
                  style={[styles.media, { maxHeight: mediaMaxHeight }]}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                  shouldPlay
                />
              ) : (
                <Image
                  source={{ uri: mediaUrl }}
                  style={[styles.media, { maxHeight: mediaMaxHeight }]}
                  resizeMode="contain"
                />
              )
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  card: {
    maxWidth: 720,
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingRight: 44,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
  },
  media: {
    width: '100%',
    minHeight: 200,
    backgroundColor: '#000',
    borderRadius: 8,
  },
});
