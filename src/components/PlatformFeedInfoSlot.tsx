import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { PlatformFeedInfoItem } from '../types/platform-feed-info';
import { getImageUrl, getAvatarUrl } from '../utils/image';
import { userApi } from '../services/api';
import { API_CONFIG } from '../config/api.config';
import { COLORS } from '../theme/colors';
import { showToast } from './CustomToast';

const DEFAULT_ROTATE_MS = 14_000;
const MEDIA_MAX_HEIGHT = 160;

type Props = {
  items: PlatformFeedInfoItem[];
  onDismiss?: (id: string) => void;
  onAfterFollow?: () => void;
  rotateIntervalMs?: number;
};

function durationForItem(item: PlatformFeedInfoItem, fallback: number): number {
  if (item.kind === 'static_card' && item.displayDurationMs && item.displayDurationMs > 3000) {
    return item.displayDurationMs;
  }
  return fallback;
}

function openHref(
  href: string,
  external: boolean | undefined,
  navigation: { navigate: (name: string, params?: object) => void }
) {
  const trimmed = (href || '').trim();
  if (!trimmed) return;
  if (external || /^https?:\/\//i.test(trimmed)) {
    void Linking.openURL(trimmed);
    return;
  }
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const m = /^\/user\/([^/?#]+)/.exec(path);
  if (m) {
    navigation.navigate('UserProfile', { username: decodeURIComponent(m[1]) });
    return;
  }
  void Linking.openURL(`${API_CONFIG.BASE_URL}${path}`);
}

export function PlatformFeedInfoSlot({
  items,
  onDismiss,
  onAfterFollow,
  rotateIntervalMs = DEFAULT_ROTATE_MS,
}: Props) {
  const navigation = useNavigation<any>();
  const [index, setIndex] = useState(0);
  const [imagePreview, setImagePreview] = useState<{ url: string; title: string } | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const itemsSignature = useMemo(() => items.map((i) => i.id).join('|'), [items]);

  useEffect(() => {
    setIndex(0);
    setImagePreview(null);
  }, [itemsSignature]);

  const safeIndex = items.length ? Math.min(index, items.length - 1) : 0;
  const active = items[safeIndex];

  const goToPrev = useCallback(() => {
    if (items.length <= 1) return;
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  const goToNext = useCallback(() => {
    if (items.length <= 1) return;
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const item = items[safeIndex];
    const ms = durationForItem(item, rotateIntervalMs);
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ms);
    return () => clearTimeout(t);
  }, [items, safeIndex, rotateIntervalMs]);

  const handleFollowReferrer = useCallback(
    async (uname: string) => {
      try {
        setFollowLoading(true);
        const res = await userApi.followUser(uname);
        if (res?.success) {
          showToast.success('Seguindo', `Agora você segue @${uname}`);
          onAfterFollow?.();
        } else {
          showToast.error('Erro', (res as { message?: string })?.message || 'Não foi possível seguir');
        }
      } catch (e: unknown) {
        const msg =
          typeof e === 'object' && e !== null && 'response' in e
            ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        showToast.error('Erro', msg || 'Não foi possível seguir');
      } finally {
        setFollowLoading(false);
      }
    },
    [onAfterFollow]
  );

  if (!items.length || !active) return null;

  const header = (
    <View style={styles.cardHeader}>
      <View style={styles.chipRow}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.primary.main} />
        <Text style={styles.chipLabel}>Dica da plataforma</Text>
      </View>
      {onDismiss ? (
        <TouchableOpacity
          accessibilityLabel="Ocultar dica"
          onPress={() => onDismiss(active.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={COLORS.text.secondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const referrerUsername =
    active.kind === 'referrer_invite'
      ? active.payload.referrer?.username?.trim() || ''
      : '';

  const profileHref =
    active.kind === 'referrer_invite' && referrerUsername
      ? (active.payload.visitProfileHref?.trim() ||
          `/user/${encodeURIComponent(referrerUsername)}`)
      : '';

  const body = (() => {
    if (active.kind === 'referrer_invite') {
      const referrer = active.payload.referrer;
      if (!referrer?.username?.trim()) {
        return (
          <>
            {header}
            <View style={styles.staticPad}>
              <Text style={styles.cardBody}>Dica indisponível no momento.</Text>
            </View>
          </>
        );
      }

      const {
        campaignTitle,
        campaignSubtitle,
        campaignBody,
        visitProfileLabel,
        followLabel,
        campaignImageUrl,
      } = active.payload;
      const title = campaignTitle?.trim() || 'Conheça quem te convidou';
      const desc =
        campaignBody?.trim() ||
        `@${referrer.username} indicou você para a Melter. Visite o perfil e siga para acompanhar as novidades.`;
      const avatarUri = getAvatarUrl(referrer.avatar);

      return (
        <>
          {header}
          {campaignImageUrl ? (
            <Pressable
              onPress={() =>
                setImagePreview({
                  url: getImageUrl(campaignImageUrl) || '',
                  title,
                })
              }
              style={styles.mediaBox}
            >
              <Image source={{ uri: getImageUrl(campaignImageUrl) || '' }} style={styles.mediaImage} resizeMode="contain" />
            </Pressable>
          ) : null}
          <View style={styles.referrerRow}>
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarLetter}>{(referrer.username || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={styles.referrerTextCol}>
              <Text style={styles.cardTitle}>{title}</Text>
              {campaignSubtitle?.trim() ? (
                <Text style={styles.cardSubtitle}>{campaignSubtitle.trim()}</Text>
              ) : null}
              <Text style={styles.cardBody}>{desc}</Text>
            </View>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btnOutline, styles.btnFlex]}
              onPress={() => openHref(profileHref, false, navigation)}
            >
              <Text style={styles.btnOutlineText}>{visitProfileLabel?.trim() || 'Ver perfil'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, styles.btnFlex, followLoading && styles.btnDisabled]}
              disabled={followLoading}
              onPress={() => void handleFollowReferrer(referrer.username)}
            >
              {followLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnPrimaryText}>{followLabel?.trim() || 'Seguir'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (active.kind === 'static_card') {
      return (
        <>
          {header}
          {active.imageUrl ? (
            <Pressable
              onPress={() =>
                setImagePreview({
                  url: getImageUrl(active.imageUrl) || '',
                  title: active.title,
                })
              }
              style={styles.mediaBox}
            >
              <Image source={{ uri: getImageUrl(active.imageUrl) || '' }} style={styles.mediaImage} resizeMode="contain" />
            </Pressable>
          ) : null}
          <View style={styles.staticPad}>
            <Text style={styles.cardTitle}>{active.title}</Text>
            {active.subtitle ? <Text style={styles.cardSubtitle}>{active.subtitle}</Text> : null}
            {active.body ? <Text style={styles.cardBodyTight}>{active.body}</Text> : null}
            <View style={styles.actionsCol}>
              {active.primaryAction ? (
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() =>
                    openHref(active.primaryAction!.href, active.primaryAction!.external, navigation)
                  }
                >
                  <Text style={styles.btnPrimaryText}>{active.primaryAction.label}</Text>
                </TouchableOpacity>
              ) : null}
              {active.secondaryAction ? (
                <TouchableOpacity
                  style={styles.btnOutline}
                  onPress={() =>
                    openHref(active.secondaryAction!.href, active.secondaryAction!.external, navigation)
                  }
                >
                  <Text style={styles.btnOutlineText}>
                    {active.secondaryAction.label === 'Ver o meu perfil' ? 'Ver perfil' : active.secondaryAction.label}
                  </Text>
                  {(active.secondaryAction.external || /^https?:\/\//i.test(active.secondaryAction.href)) && (
                    <Ionicons name="open-outline" size={16} color={COLORS.primary.main} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </>
      );
    }

    return null;
  })();

  return (
    <>
      <View style={styles.card}>
        {body}
        {items.length > 1 ? (
          <View style={styles.carouselNav}>
            <TouchableOpacity
              style={styles.carouselArrow}
              onPress={goToPrev}
              accessibilityLabel="Dica anterior"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.primary.main} />
            </TouchableOpacity>
            <View style={styles.dots}>
              {items.map((it, i) => (
                <TouchableOpacity
                  key={it.id}
                  onPress={() => setIndex(i)}
                  accessibilityLabel={`Dica ${i + 1} de ${items.length}`}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <View style={[styles.dot, i === safeIndex ? styles.dotActive : styles.dotInactive]} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.carouselArrow}
              onPress={goToNext}
              accessibilityLabel="Próxima dica"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary.main} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <Modal visible={Boolean(imagePreview)} transparent animationType="fade" onRequestClose={() => setImagePreview(null)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalBar}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {imagePreview?.title || 'Dica da plataforma'}
            </Text>
            <TouchableOpacity onPress={() => setImagePreview(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <Pressable style={styles.modalBody} onPress={() => setImagePreview(null)}>
            {imagePreview?.url ? (
              <Image source={{ uri: imagePreview.url }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  mediaBox: {
    backgroundColor: '#000',
    height: MEDIA_MAX_HEIGHT,
    width: '100%',
  },
  mediaImage: {
    width: '100%',
    height: MEDIA_MAX_HEIGHT,
  },
  referrerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  avatarWrap: {},
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  referrerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  cardBody: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  cardBodyTight: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  staticPad: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  actionsCol: {
    marginTop: 12,
    gap: 10,
  },
  btnFlex: {
    flex: 1,
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    backgroundColor: COLORS.background.default,
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary.main,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  carouselNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  carouselArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.background.default,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: COLORS.primary.main,
  },
  dotInactive: {
    backgroundColor: COLORS.border.medium,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  modalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  modalBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalImage: {
    width: '100%',
    height: '100%',
    maxHeight: '90%',
  },
});
