import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { AppVideo } from '../AppVideo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { getSellerVerificationResponsiveLayout } from '../../config/shops/seller-verification.config';
import { SellerVerificationFieldHelp } from './SellerVerificationFieldHelp';

type Props = {
  label: string;
  required?: boolean;
  viewOnly?: boolean;
  highlight?: boolean;
  helperText?: string;
  tipText?: string;
  previewUri?: string | null;
  placeholderText: string;
  onPick?: () => void;
  onClear?: () => void;
  picking?: boolean;
  /** `video` usa player de prévia em vez de imagem. */
  variant?: 'image' | 'video';
  /** Sobrescreve alturas responsivas (sincronizar com exemplo ao lado). */
  previewHeight?: number;
  areaHeight?: number;
};

export function SellerDocumentUploadField({
  label,
  required,
  viewOnly,
  highlight,
  helperText,
  tipText,
  previewUri,
  placeholderText,
  onPick,
  onClear,
  picking,
  variant = 'image',
  previewHeight: previewHeightProp,
  areaHeight: areaHeightProp,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { width: screenWidth } = useWindowDimensions();
  const responsive = getSellerVerificationResponsiveLayout(screenWidth);
  const previewHeight = previewHeightProp ?? responsive.previewHeight;
  const areaHeight = areaHeightProp ?? responsive.areaHeight;
  const showPreview = Boolean(previewUri);
  const interactive = !viewOnly && onPick;
  const uploadIconSize = screenWidth < 400 ? 22 : 28;

  return (
    <View style={[styles.wrap, highlight && styles.wrapHighlight]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
        {(helperText || tipText) ? (
          <View style={styles.labelEnd}>
            {helperText ? (
              <Text style={styles.helper} numberOfLines={1}>
                {helperText}
              </Text>
            ) : null}
            {tipText && !viewOnly ? <SellerVerificationFieldHelp text={tipText} /> : null}
          </View>
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
          <ActivityIndicator color={colors.secondary.main} />
        ) : showPreview ? (
          variant === 'video' ? (
            <AppVideo
              uri={previewUri!}
              style={{ width: '100%', height: previewHeight }}
              contentFit="contain"
              nativeControls
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
              size={uploadIconSize}
              color={viewOnly ? colors.text.tertiary : colors.text.secondary}
            />
            <Text style={styles.placeholderText}>
              {viewOnly ? 'Nenhum arquivo enviado' : placeholderText}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {showPreview && onClear && !viewOnly ? (
        <TouchableOpacity style={styles.clearBtn} onPress={onClear} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.states.error} />
          <Text style={styles.clearText}>Remover</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  wrap: {
    minWidth: 0,
    width: '100%',
  },
  wrapHighlight: {
    borderWidth: 2,
    borderColor: c.states.error,
    borderRadius: 10,
    padding: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  labelEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    flexShrink: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text.primary,
  },
  helper: {
    fontSize: 11,
    color: c.text.secondary,
    lineHeight: 14,
  },
  area: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: c.border.medium,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 8,
  },
  areaViewOnly: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.tertiary,
  },
  areaWithPreview: {
    borderColor: c.states.success,
  },
  placeholder: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  placeholderText: {
    fontSize: 11,
    color: c.text.secondary,
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
    color: c.states.error,
    fontWeight: '600',
  },
});
