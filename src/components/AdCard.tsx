import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus, type Video as VideoRef } from 'expo-av';
import { Ad } from '../types/feed';
import { COLORS } from '../theme/colors';
import { devWarn } from '../config/dev-logs';

interface AdCardProps {
  ad: Ad;
  onView: (adId: string) => void;
  onClick: (adId: string) => void;
  /** Próximo anúncio ao pular ou ao fim do vídeo (só passar com 2+ ads no feed). */
  onSkip?: () => void;
  onVideoEnd?: () => void;
}

const MIN_SKIP_TIME = 5;
const AUTO_SKIP_TIME = 30;

export function AdCard({ ad, onView, onClick, onSkip, onVideoEnd }: AdCardProps) {
  const [hasViewed, setHasViewed] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  const onViewRef = useRef(onView);
  const onSkipRef = useRef(onSkip);
  const onVideoEndRef = useRef(onVideoEnd);
  const videoRef = useRef<VideoRef>(null);
  onViewRef.current = onView;
  onSkipRef.current = onSkip;
  onVideoEndRef.current = onVideoEnd;

  // Registra view uma vez por montagem (sem re-disparar quando canSkip muda).
  useEffect(() => {
    if (!ad?._id || hasViewed) return;
    onViewRef.current(ad._id);
    setHasViewed(true);
  }, [ad?._id, hasViewed]);

  // Timer de pular/auto-avanço só com 2+ anúncios (onSkip definido no feed).
  useEffect(() => {
    if (!ad?._id || !onSkip) return;

    setTimeElapsed(0);
    setCanSkip(false);

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 1;
      setTimeElapsed(elapsed);

      if (elapsed >= MIN_SKIP_TIME) {
        setCanSkip(true);
      }

      if (elapsed >= AUTO_SKIP_TIME) {
        elapsed = 0;
        setTimeElapsed(0);
        setCanSkip(false);
        queueMicrotask(() => onSkipRef.current?.());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ad?._id, onSkip]);

  // Libera decoder de vídeo ao sair da lista (evita OOM / fechamento silencioso no Android).
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (!v) return;
      void v.pauseAsync().catch(() => undefined);
      void v.unloadAsync().catch(() => undefined);
    };
  }, [ad?._id]);

  const handleAdClick = async () => {
    onClick(ad._id);
    if (ad.link) {
      try {
        const canOpen = await Linking.canOpenURL(ad.link);
        if (canOpen) {
          await Linking.openURL(ad.link);
        }
      } catch (error) {
        devWarn('[AdCard] link:', error);
      }
    }
  };

  const handleSkip = () => {
    if (canSkip && onSkip) {
      onSkip();
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded || !status.didJustFinish) return;
    queueMicrotask(() => onVideoEndRef.current?.());
  };

  const handleVideoLoaded = async () => {
    setVideoLoading(false);
    try {
      await videoRef.current?.playAsync();
    } catch {
      /* ignore */
    }
  };

  if (!ad?._id) {
    return null;
  }

  const isVideo =
    ad.type?.toUpperCase() === 'VIDEO' ||
    ad.mediaUrl?.toLowerCase().endsWith('.mp4') ||
    ad.mediaUrl?.toLowerCase().endsWith('.mov');
  const isImage = ad.type?.toUpperCase() === 'IMAGE' || (!isVideo && ad.mediaUrl);

  return (
    <View style={styles.container}>
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>📢 Anúncio Patrocinado</Text>
      </View>

      <View style={styles.adContent}>
        {isImage && ad.mediaUrl ? (
          <TouchableOpacity onPress={handleAdClick} activeOpacity={0.9}>
            <View style={styles.mediaContainer}>
              <Image source={{ uri: ad.mediaUrl }} style={styles.adMedia} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        ) : null}

        {isVideo && ad.mediaUrl ? (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={{ uri: ad.mediaUrl }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
              isMuted
              useNativeControls
              style={styles.adMedia}
              onLoadStart={() => setVideoLoading(true)}
              onLoad={handleVideoLoaded}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onError={() => setVideoLoading(false)}
            />
            {videoLoading ? (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator color={COLORS.secondary.main} size="large" />
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.adInfo}>
          {ad.title ? (
            <Text style={styles.adTitle} numberOfLines={1}>
              {ad.title}
            </Text>
          ) : null}
          {ad.description ? (
            <Text style={styles.adDescription} numberOfLines={2}>
              {ad.description}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.ctaContainer} onPress={handleAdClick} activeOpacity={0.7}>
            <Text style={styles.adLink}>Saiba mais</Text>
          </TouchableOpacity>
        </View>
      </View>

      {onSkip ? (
        <View style={styles.skipContainer}>
          {!canSkip ? (
            <View style={styles.skipTimer}>
              <Text style={styles.skipTimerText}>Pular em {Math.max(0, MIN_SKIP_TIME - timeElapsed)}s</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Pular Anúncio ⏩</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {onSkip ? (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((timeElapsed / AUTO_SKIP_TIME) * 100, 100)}%` },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 4,
  },
  adBadge: {
    backgroundColor: '#fef3c7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  adBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adContent: {
    position: 'relative',
  },
  mediaContainer: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.secondary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adMedia: {
    width: '100%',
    height: 280,
  },
  videoContainer: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.secondary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adInfo: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  adTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  adDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  ctaContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  adLink: {
    fontSize: 14,
    color: '#B63385',
    fontWeight: 'bold',
  },
  skipContainer: {
    position: 'absolute',
    top: 50,
    right: 12,
    zIndex: 10,
  },
  skipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  skipButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  skipTimer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  skipTimerText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#f1f5f9',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#B63385',
  },
});
