import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ad } from '../types/feed';
import { COLORS } from '../theme/colors';

interface AdCardProps {
  ad: Ad;
  onView: (adId: string) => void;
  onClick: (adId: string) => void;
  onSkip?: () => void;
}

export function AdCard({ ad, onView, onClick, onSkip }: AdCardProps) {
  const [hasViewed, setHasViewed] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);

  const MIN_SKIP_TIME = 5; 
  const AUTO_SKIP_TIME = 30;

  useEffect(() => {
    if (!hasViewed) {
      onView(ad._id);
      setHasViewed(true);
    }

    const interval = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        if (newTime >= MIN_SKIP_TIME && !canSkip) {
          setCanSkip(true);
        }
        if (newTime >= AUTO_SKIP_TIME && onSkip) {
          onSkip();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [ad._id, hasViewed, onView, onSkip, canSkip]);

  const handleAdClick = async () => {
    onClick(ad._id);
    if (ad.link) {
      try {
        const canOpen = await Linking.canOpenURL(ad.link);
        if (canOpen) {
          await Linking.openURL(ad.link);
        } else {
          console.warn('[AdCard] Não foi possível abrir o link:', ad.link);
        }
      } catch (error) {
        console.error('[AdCard] Erro ao abrir link:', error);
      }
    }
  };

  const handleSkip = () => {
    if (canSkip && onSkip) {
      onSkip();
    }
  };

  // Melhoria na detecção do tipo de mídia
  const isVideo = ad.type?.toUpperCase() === 'VIDEO' || ad.mediaUrl?.toLowerCase().endsWith('.mp4') || ad.mediaUrl?.toLowerCase().endsWith('.mov');
  const isImage = ad.type?.toUpperCase() === 'IMAGE' || (!isVideo && ad.mediaUrl);

  return (
    <View style={styles.container}>
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>📢 Anúncio Patrocinado</Text>
      </View>

      <TouchableOpacity
        style={styles.adContent}
        onPress={handleAdClick}
        activeOpacity={0.9}
      >
        {isImage && ad.mediaUrl && (
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: ad.mediaUrl }}
              style={styles.adMedia}
              resizeMode="contain"
              onError={(e) => console.error('[AdCard] Erro ao carregar imagem:', e.nativeEvent.error)}
            />
          </View>
        )}

        {isVideo && ad.mediaUrl && (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: ad.mediaUrl }}
              rate={1.0}
              volume={1.0}
              isMuted={true}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              style={styles.adMedia}
              onLoadStart={() => {
                setVideoLoading(true);
              }}
              onLoad={() => {
                setVideoLoading(false);
              }}
              onError={(error: any) => {
                console.error('[AdCard] Erro no vídeo:', error);
                setVideoLoading(false);
              }}
            />
            {videoLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={COLORS.secondary.main} size="large" />
              </View>
            )}
          </View>
        )}

        <View style={styles.adInfo}>
          {ad.title && (
            <Text style={styles.adTitle} numberOfLines={1}>
              {ad.title}
            </Text>
          )}
          {ad.description && (
            <Text style={styles.adDescription} numberOfLines={2}>
              {ad.description}
            </Text>
          )}
          <TouchableOpacity 
            style={styles.ctaContainer}
            onPress={handleAdClick}
            activeOpacity={0.7}
          >
            <Text style={styles.adLink}>Saiba mais</Text>
            <Text style={styles.adUrl} numberOfLines={1}>
              {ad.link ? (() => {
                try {
                  const url = new URL(ad.link);
                  return url.hostname.replace('www.', '');
                } catch {
                  return ad.link.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                }
              })() : 'melter.com.br'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {onSkip && (
        <View style={styles.skipContainer}>
          {!canSkip ? (
            <View style={styles.skipTimer}>
              <Text style={styles.skipTimerText}>
                Pular em {MIN_SKIP_TIME - timeElapsed}s
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Pular Anúncio ⏩</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min((timeElapsed / AUTO_SKIP_TIME) * 100, 100)}%`,
            },
          ]}
        />
      </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    height: 350,
    backgroundColor: COLORS.secondary.main, // Rosa do site (#B63385)
    justifyContent: 'center',
    alignItems: 'center',
  },
  adMedia: {
    width: '100%',
    height: 350,
  },
  videoContainer: {
    width: '100%',
    height: 350,
    backgroundColor: COLORS.secondary.main, // Rosa do site (#B63385)
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  adLink: {
    fontSize: 14,
    color: '#B63385',
    fontWeight: 'bold',
  },
  adUrl: {
    fontSize: 12,
    color: '#94a3b8',
    maxWidth: '70%',
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
