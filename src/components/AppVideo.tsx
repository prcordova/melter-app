import React, { useEffect, useImperativeHandle, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoContentFit } from 'expo-video';

export interface AppVideoHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  /** Entra no fullscreen nativo do expo-video (útil ao girar o aparelho). */
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
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
  /**
   * Retoma neste tempo **uma única vez** após o 1º `readyToPlay`.
   * Não reaplica em buffering/seek (senão o progresso salvo “puxa” de volta).
   */
  startTime?: number;
  /** Intervalo (s) do evento `timeUpdate`. 0 = desligado. */
  timeUpdateInterval?: number;
  onLoadStart?: () => void;
  /** Duração em segundos — só no 1º readyToPlay desta URI. */
  onLoad?: (durationSeconds: number) => void;
  onTimeUpdate?: (currentTime: number, durationSeconds: number) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onFullscreenEnter?: () => void;
  onFullscreenExit?: () => void;
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
  startTime = 0,
  timeUpdateInterval = 0,
  onLoadStart,
  onLoad,
  onTimeUpdate,
  onEnd,
  onError,
  onFullscreenEnter,
  onFullscreenExit,
  ref,
}: AppVideoProps) {
  const videoViewRef = useRef<VideoView>(null);
  const notifiedReadyRef = useRef(false);
  const resumeAppliedRef = useRef(false);
  const startTimeRef = useRef(startTime);

  startTimeRef.current = startTime;

  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = muted;
    p.timeUpdateEventInterval = timeUpdateInterval > 0 ? timeUpdateInterval : 0;
    // Buffer à frente ajuda seek/scrub sem travar tanto em rede lenta.
    p.bufferOptions = {
      preferredForwardBufferDuration: 30,
      minBufferForPlayback: 2,
      prioritizeTimeOverSizeThreshold: true,
    };
  });

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        if (!Number.isFinite(seconds) || seconds < 0) return;
        player.currentTime = seconds;
      },
      getCurrentTime: () => player.currentTime,
      getDuration: () => player.duration,
      enterFullscreen: async () => {
        await videoViewRef.current?.enterFullscreen();
      },
      exitFullscreen: async () => {
        await videoViewRef.current?.exitFullscreen();
      },
    }),
    [player]
  );

  useEffect(() => {
    notifiedReadyRef.current = false;
    resumeAppliedRef.current = false;
  }, [uri]);

  useEffect(() => {
    player.loop = loop;
  }, [player, loop]);

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    player.timeUpdateEventInterval = timeUpdateInterval > 0 ? timeUpdateInterval : 0;
  }, [player, timeUpdateInterval]);

  const shouldPlay = autoPlay && !paused;
  useEffect(() => {
    if (shouldPlay) player.play();
    else player.pause();
  }, [player, shouldPlay]);

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'loading' && !notifiedReadyRef.current) {
      onLoadStart?.();
    }
    // readyToPlay também dispara após seek/buffer — só notificar/retomar no 1º ciclo desta URI.
    if (status === 'readyToPlay') {
      const durationSeconds = Number.isFinite(player.duration) ? player.duration : 0;
      if (!notifiedReadyRef.current) {
        notifiedReadyRef.current = true;
        onLoad?.(durationSeconds);
      }
      const resumeAt = startTimeRef.current;
      if (
        !resumeAppliedRef.current &&
        resumeAt > 0 &&
        durationSeconds > 0 &&
        resumeAt < durationSeconds - 0.25
      ) {
        resumeAppliedRef.current = true;
        player.currentTime = resumeAt;
      } else if (!resumeAppliedRef.current) {
        resumeAppliedRef.current = true;
      }
    }
    if (status === 'error') onError?.(error?.message ?? 'Erro ao carregar vídeo');
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!onTimeUpdate) return;
    const durationSeconds = Number.isFinite(player.duration) ? player.duration : 0;
    onTimeUpdate(currentTime, durationSeconds);
  });

  useEventListener(player, 'playToEnd', () => {
    onEnd?.();
  });

  return (
    <VideoView
      ref={videoViewRef}
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={nativeControls}
      fullscreenOptions={{
        enable: nativeControls,
        // Em landscape o player nativo assume; ao voltar pra portrait, sai do fullscreen.
        orientation: 'landscape',
        autoExitOnRotate: true,
      }}
      onFullscreenEnter={onFullscreenEnter}
      onFullscreenExit={onFullscreenExit}
    />
  );
}
