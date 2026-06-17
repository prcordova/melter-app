import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { getImageUrl } from '../../utils/image';
import {
  getSellerVerificationResponsiveLayout,
  type SellerVerificationExampleMedia,
} from '../../config/shops/seller-verification.config';

type Props = {
  children: React.ReactNode;
  example: SellerVerificationExampleMedia;
  onOpenExample: (example: SellerVerificationExampleMedia) => void;
  footer?: React.ReactNode;
};

export function SellerVerificationUploadWithExample({
  children,
  example,
  onOpenExample,
  footer,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const { areaHeight, thumbWidth } = getSellerVerificationResponsiveLayout(screenWidth);
  const mediaUrl = getImageUrl(example.url) ?? example.url;
  const isVideo = example.mediaKind === 'video';
  const overlayIconSize = screenWidth < 400 ? (isVideo ? 32 : 28) : isVideo ? 48 : 40;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.uploadGrow}>{children}</View>
        <View style={[styles.exampleAside, { width: thumbWidth, maxWidth: thumbWidth }]}>
          <Text style={styles.exampleCaption} numberOfLines={2}>
            {isVideo ? 'Exemplo — toque para ampliar e assistir' : 'Exemplo — toque para ampliar'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityLabel={`Ampliar: ${example.title}`}
            onPress={() => onOpenExample(example)}
            style={[styles.exampleThumbWrap, { height: areaHeight }]}
          >
            {isVideo ? (
              <Video
                source={{ uri: mediaUrl }}
                style={styles.exampleThumb}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isMuted
              />
            ) : (
              <Image source={{ uri: mediaUrl }} style={styles.exampleThumb} resizeMode="cover" />
            )}
            <View style={styles.exampleOverlay} pointerEvents="none">
              <Ionicons
                name={isVideo ? 'play-circle-outline' : 'search-outline'}
                size={overlayIconSize}
                color="#fff"
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  footer: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    width: '100%',
  },
  uploadGrow: {
    flex: 1,
    minWidth: 0,
  },
  exampleAside: {
    flexShrink: 0,
  },
  exampleCaption: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginBottom: 4,
    lineHeight: 13,
  },
  exampleThumbWrap: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.tertiary,
  },
  exampleThumb: {
    width: '100%',
    height: '100%',
  },
  exampleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
