import React, { useEffect, useImperativeHandle } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoContentFit } from 'expo-video';

export interface AppVideoHandle {
  seekTo: (seconds: number) => void;
}

interface AppVideoProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: VideoContentFit;
  /** Inicia sozinho quando carregar. Combinado com `paused` para controle externo (ex.: story pausado). */
  autoPlay?: boolean;
  paused?: boolean;
  loop?: boolean;
  muted?: boolean;
  nativeControls?: boolean;
  onLoadStart?: () => void;
  /** Duração em segundos. */
  onLoad?: (durationSeconds: number) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  ref?: React.Ref<AppVideoHandle>;
}

/** Player padrão do app (expo-video). O player é liberado ao desmontar, evitando decoders presos no Android. */
export function AppVideo({
  uri,
  style,
  contentFit = 'contain',
  autoPlay = false,
  paused = false,
  loop = false,
  muted = false,
  nativeControls = false,
  onLoadStart,
  onLoad,
  onEnd,
  onError,
  ref,
}: AppVideoProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = muted;
  });

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      player.currentTime = seconds;
    },
  }), [player]);

  useEffect(() => {
    player.loop = loop;
  }, [player, loop]);

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  const shouldPlay = autoPlay && !paused;
  useEffect(() => {
    if (shouldPlay) player.play();
    else player.pause();
  }, [player, shouldPlay]);

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'loading') onLoadStart?.();
    if (status === 'error') onError?.(error?.message ?? 'Erro ao carregar vídeo');
  });

  useEventListener(player, 'sourceLoad', ({ duration }) => {
    onLoad?.(duration);
  });

  useEventListener(player, 'playToEnd', () => {
    onEnd?.();
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={nativeControls}
      fullscreenOptions={{ enable: nativeControls }}
    />
  );
}
