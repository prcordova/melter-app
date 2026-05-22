import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import {
  SELLER_VERIFICATION_DOC_PREVIEW_HEIGHT,
  SELLER_VERIFICATION_VIDEO_PROOF_PREVIEW_HEIGHT,
  SELLER_VERIFICATION_VIDEO_PROOF_AREA_HEIGHT,
} from '../../config/shops/seller-verification.config';

type Props = {
  label: string;
  required?: boolean;
  viewOnly?: boolean;
  highlight?: boolean;
  helperText?: string;
  previewUri?: string | null;
  placeholderText: string;
  onPick?: () => void;
  onClear?: () => void;
  picking?: boolean;
  /** `video` usa player de prévia em vez de imagem. */
  variant?: 'image' | 'video';
};

export function SellerDocumentUploadField({
  label,
  required,
  viewOnly,
  highlight,
  helperText,
  previewUri,
  placeholderText,
  onPick,
  onClear,
  picking,
  variant = 'image',
}: Props) {
  const showPreview = Boolean(previewUri);
  const interactive = !viewOnly && onPick;
  const previewHeight =
    variant === 'video'
      ? SELLER_VERIFICATION_VIDEO_PROOF_PREVIEW_HEIGHT
      : SELLER_VERIFICATION_DOC_PREVIEW_HEIGHT;
  const areaHeight =
    variant === 'video'
      ? SELLER_VERIFICATION_VIDEO_PROOF_AREA_HEIGHT
      : previewHeight + 16;

  return (
    <View style={[styles.wrap, highlight && styles.wrapHighlight]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
        {helperText ? (
          <Text style={styles.helper} numberOfLines={2}>
            {helperText}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[
          styles.area,
          viewOnly && styles.areaViewOnly,
          showPreview && !viewOnly && styles.areaWithPreview,
          { minHeight: areaHeight, maxHeight: areaHeight },
        ]}
        onPress={interactive ? onPick : undefined}
        disabled={!interactive || picking}
        activeOpacity={interactive ? 0.75 : 1}
      >
        {picking ? (
          <ActivityIndicator color={COLORS.secondary.main} />
        ) : showPreview ? (
          variant === 'video' ? (
            <Video
              source={{ uri: previewUri! }}
              style={{ width: '100%', height: previewHeight }}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              isLooping={false}
            />
          ) : (
            <Image
              source={{ uri: previewUri! }}
              style={{ width: '100%', height: previewHeight }}
              resizeMode="contain"
            />
          )
        ) : (
          <View style={styles.placeholder}>
            <Ionicons
              name={variant === 'video' ? 'videocam-outline' : 'cloud-upload-outline'}
              size={28}
              color={viewOnly ? COLORS.text.tertiary : COLORS.text.secondary}
            />
            <Text style={styles.placeholderText}>
              {viewOnly ? 'Nenhum arquivo enviado' : placeholderText}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {showPreview && onClear && !viewOnly ? (
        <TouchableOpacity style={styles.clearBtn} onPress={onClear} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={COLORS.states.error} />
          <Text style={styles.clearText}>Remover</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 0,
    width: '100%',
  },
  wrapHighlight: {
    borderWidth: 2,
    borderColor: COLORS.states.error,
    borderRadius: 10,
    padding: 6,
  },
  labelRow: {
    marginBottom: 6,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  helper: {
    fontSize: 11,
    color: COLORS.text.secondary,
    lineHeight: 14,
  },
  area: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border.medium,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 8,
  },
  areaViewOnly: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.tertiary,
  },
  areaWithPreview: {
    borderColor: COLORS.states.success,
  },
  placeholder: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  placeholderText: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  clearText: {
    fontSize: 12,
    color: COLORS.states.error,
    fontWeight: '600',
  },
});
