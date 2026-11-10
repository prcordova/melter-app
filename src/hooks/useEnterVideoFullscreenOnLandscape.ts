import { useEffect, useRef } from 'react';
import { Dimensions, type ScaledSize } from 'react-native';
import type { AppVideoHandle } from '../components/AppVideo';

function isLandscape(size: ScaledSize) {
  return size.width > size.height;
}

/**
 * Com o viewer/modal de vídeo aberto: ao girar para landscape, entra em fullscreen nativo.
 * (expo-video pausa o JS no Android em fullscreen — por isso usamos o enter nativo.)
 */
export function useEnterVideoFullscreenOnLandscape(
  enabled: boolean,
  videoRef: React.RefObject<AppVideoHandle | null>
) {
  const lastLandscapeRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      lastLandscapeRef.current = false;
      return;
    }

    const maybeEnter = (window: ScaledSize) => {
      const landscape = isLandscape(window);
      if (landscape && !lastLandscapeRef.current) {
        void videoRef.current?.enterFullscreen().catch(() => undefined);
      }
      lastLandscapeRef.current = landscape;
    };

    maybeEnter(Dimensions.get('window'));
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      maybeEnter(window);
    });

    return () => {
      sub.remove();
      lastLandscapeRef.current = false;
    };
  }, [enabled, videoRef]);
}
