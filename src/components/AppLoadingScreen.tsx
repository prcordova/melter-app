import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { useAppUpdate, type AppUpdateStatus } from '../contexts/AppUpdateContext';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

const LOGO_WIDTH = 200;
const TRACK_WIDTH = 180;
const SEGMENT_WIDTH = 64;

/** Mesmo desenho de `melter/public/assets/imgs/logo.svg`. */
function MelterLogo({ width }: { width: number }) {
  return (
    <Svg width={width} height={(width * 45) / 200} viewBox="0 0 200 45" fill="none">
      <Path
        d="M189.542 16.6819V11.1536H179.507V44.3934H189.542L189.648 28.1608C189.929 25.9777 191.267 21.8932 196.056 21.6115H200V10.8719C195.376 11.1574 193.069 12.4488 189.542 16.6819Z"
        fill="#650A97"
      />
      <Path
        d="M54.0352 28.5482C51.0247 5.13636 90.9366 2.35079 87.7324 29.8158H64.2119C64.2119 36.1187 74.0352 38.2313 76.4648 32.9144H87.2041C85.4435 45.9427 57.0457 51.9601 54.0352 28.5482ZM70.5928 18.3373C66.3307 18.3373 64.4932 21.0484 64.4932 24.0414H77.1689C77.1689 20.5555 74.8547 18.3374 70.5928 18.3373Z"
        fill="#CA3994"
      />
      <Path
        d="M138.958 28.5465C135.948 5.13471 175.859 2.34913 172.655 29.8141H149.135C149.135 36.1169 158.958 38.2296 161.388 32.9127H172.127C170.366 45.941 141.969 51.9584 138.958 28.5465ZM155.516 18.3356C151.254 18.3356 149.416 21.0467 149.416 24.0397H162.092C162.092 20.5538 159.778 18.3357 155.516 18.3356Z"
        fill="#650A97"
      />
      <Path
        d="M10.0704 44.3582V19.3932L19.5423 44.3582H27.8873L37.1127 19.3932V44.3582H47.1831V2.63245H35.3521L23.662 31.4003L12.0071 2.63245H0V44.3582H10.0704Z"
        fill="#CA3994"
      />
      <Rect x={94.6064} y={0.308472} width={10.1409} height={44.0849} fill="#AE3E95" />
      <Path
        d="M132.107 44.1821L132.036 35.6257L127.177 35.5552C125.557 35.4144 125.416 33.2665 125.416 33.2665V19.4988H132.001V11.1888H125.416V3.05493H115.135V11.1888H111.438V19.4988H115.135L115.24 34.358C115.24 36.4355 115.416 45.9075 132.107 44.1821Z"
        fill="#AE3E95"
      />
    </Svg>
  );
}

function versionStatusLabel(status: AppUpdateStatus, checking: boolean, latestVersion: string | null): string | null {
  if (checking) return 'verificando atualizações…';
  switch (status) {
    case 'up-to-date':
      return 'versão mais recente';
    case 'available':
      return latestVersion ? `nova versão ${latestVersion} disponível` : 'nova versão disponível';
    case 'required':
      return 'atualização obrigatória';
    default:
      return null;
  }
}

/** Tela enquanto a sessão carrega: logo central, barra de progresso e versão instalada + status de atualização. */
export function AppLoadingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { installedVersion, status, checking, latestVersion, canCheck, checkNow } = useAppUpdate();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (canCheck) void checkNow();
  }, [canCheck, checkNow]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-SEGMENT_WIDTH, TRACK_WIDTH],
  });

  const statusLabel = versionStatusLabel(status, checking, latestVersion);
  const needsUpdate = !checking && (status === 'available' || status === 'required');

  return (
    <View style={styles.container}>
      <MelterLogo width={LOGO_WIDTH} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.track}>
          <Animated.View style={[styles.segment, { transform: [{ translateX }] }]} />
        </View>
        {installedVersion ? (
          <Text style={styles.version}>
            Versão {installedVersion}
            {statusLabel ? (
              <Text style={needsUpdate ? { color: colors.states.error } : undefined}> · {statusLabel}</Text>
            ) : null}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.background.default,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      gap: 10,
    },
    track: {
      width: TRACK_WIDTH,
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
      backgroundColor: c.action.selected,
    },
    segment: {
      width: SEGMENT_WIDTH,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.secondary.main,
    },
    version: {
      fontSize: 12,
      color: c.text.secondary,
    },
  });
