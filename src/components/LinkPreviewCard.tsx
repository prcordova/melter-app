import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import type { LinkPreviewData } from '../services/links/api';
import { getImageUrl } from '../utils/image';
import {
  ensureHttpUrl,
  extractYouTubeVideoId,
  getLinkFaviconUrl,
  getUrlHostname,
  getYouTubeThumbnail,
  isMelterSiteUrl,
  isYouTubeUrl,
} from '../utils/link-utils';
import { CustomModal } from './CustomModal';
import { showToast } from './CustomToast';

export type { LinkPreviewData };

/** Link do perfil anexado ao post (`post.linkId`) no formato do preview. */
export function postLinkToPreview(link: {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
}): LinkPreviewData {
  return {
    url: link.url,
    title: link.title,
    description: link.description ?? '',
    image: link.imageUrl ?? null,
    site: getUrlHostname(link.url),
    type: isYouTubeUrl(link.url) ? 'youtube' : 'website',
  };
}

interface LinkPreviewCardProps {
  preview: LinkPreviewData;
  loading?: boolean;
  onRemove?: () => void;
  /** Exige confirmação antes de abrir link externo (feed). */
  confirmBeforeNavigate?: boolean;
  /** Versão compacta (post original compartilhado / chat). */
  compact?: boolean;
}

function resolveThumbSources(preview: LinkPreviewData): string[] {
  const sources: string[] = [];
  const image = preview.image ? getImageUrl(preview.image) ?? preview.image : null;
  if (image) sources.push(image);

  const favicon =
    (preview.favicon ? getImageUrl(preview.favicon) ?? preview.favicon : null) ||
    getLinkFaviconUrl(preview.url) ||
    getLinkFaviconUrl(preview.site);
  if (favicon && !sources.includes(favicon)) sources.push(favicon);

  if (preview.type === 'youtube' && isYouTubeUrl(preview.url)) {
    const videoId = extractYouTubeVideoId(preview.url);
    if (videoId) {
      const hq = getYouTubeThumbnail(videoId, 'hq');
      if (!sources.includes(hq)) sources.push(hq);
    }
  }

  return sources;
}

/** Card de preview de link — espelha `melter/components/LinkPreviewCard`. */
export function LinkPreviewCard({
  preview,
  loading = false,
  onRemove,
  confirmBeforeNavigate = false,
  compact = false,
}: LinkPreviewCardProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const thumbSources = useMemo(() => (loading ? [] : resolveThumbSources(preview)), [loading, preview]);
  const [thumbIndex, setThumbIndex] = useState(0);
  const thumbSrc = thumbSources[thumbIndex] ?? null;
  const isYouTube = preview.type === 'youtube';
  const thumbSize = compact ? 64 : 88;

  useEffect(() => {
    setThumbIndex(0);
  }, [preview.url, preview.image, preview.favicon]);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => showToast.error('Não foi possível abrir o link'));
  };

  const handlePress = () => {
    if (!preview.url) return;
    const url = ensureHttpUrl(preview.url);
    if (confirmBeforeNavigate && !isMelterSiteUrl(url)) {
      setPendingUrl(url);
      return;
    }
    openUrl(url);
  };

  if (loading) {
    return (
      <View style={[styles.card, styles.row]}>
        <View style={[styles.thumb, { width: thumbSize, height: thumbSize }]} />
        <View style={styles.info}>
          <View style={[styles.skeletonLine, { width: '80%', height: 14 }]} />
          <View style={[styles.skeletonLine, { width: '100%' }]} />
          <View style={[styles.skeletonLine, { width: '60%' }]} />
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={[styles.card, styles.row]} onPress={handlePress} activeOpacity={0.8}>
        <View style={[styles.thumb, { width: thumbSize, height: thumbSize }]}>
          {thumbSrc ? (
            <Image
              source={{ uri: thumbSrc }}
              style={[styles.thumbImage, thumbIndex > 0 && !isYouTube && styles.thumbImageContain]}
              resizeMode={isYouTube && thumbIndex === 0 ? 'cover' : thumbIndex > 0 ? 'contain' : 'cover'}
              onError={() => setThumbIndex((prev) => (prev + 1 < thumbSources.length ? prev + 1 : prev))}
            />
          ) : (
            <Ionicons name="globe-outline" size={compact ? 24 : 32} color={colors.text.tertiary} />
          )}
          {isYouTube && thumbSrc && thumbIndex === 0 ? (
            <View style={styles.playBadge}>
              <Ionicons name="play" size={compact ? 16 : 20} color="#ffffff" />
            </View>
          ) : null}
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {preview.title || getUrlHostname(preview.url)}
          </Text>
          {preview.description && (!compact || isYouTube) ? (
            <Text style={styles.description} numberOfLines={compact ? 1 : 2}>
              {preview.description}
            </Text>
          ) : null}
          <View style={styles.siteRow}>
            <Ionicons name="link-outline" size={12} color={colors.text.secondary} />
            <Text style={styles.site} numberOfLines={1}>
              {preview.site || getUrlHostname(preview.url)}
            </Text>
          </View>
        </View>

        {onRemove ? (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Remover preview"
          >
            <Ionicons name="close" size={16} color={colors.text.primary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      <CustomModal
        visible={pendingUrl != null}
        onClose={() => setPendingUrl(null)}
        icon="open-outline"
        title="Sair da Melter"
        message={`Você está indo para um site externo:\n${pendingUrl ? getUrlHostname(pendingUrl) : ''}`}
        buttons={[
          { text: 'Cancelar', style: 'cancel', onPress: () => setPendingUrl(null) },
          {
            text: 'Abrir link',
            onPress: () => {
              const url = pendingUrl;
              setPendingUrl(null);
              if (url) openUrl(url);
            },
          },
        ]}
      />
    </>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: c.border.light,
    borderRadius: 10,
    backgroundColor: c.background.paper,
    padding: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  thumb: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: c.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbImageContain: {
    width: '70%',
    height: '70%',
  },
  playBadge: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
    paddingRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text.primary,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    color: c.text.secondary,
  },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  site: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: c.text.secondary,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.background.paper,
    borderWidth: 1,
    borderColor: c.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonLine: {
    height: 10,
    borderRadius: 4,
    backgroundColor: c.background.tertiary,
  },
});
