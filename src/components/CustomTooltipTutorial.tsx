import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Button } from './Button';
import { useThemedStyles } from '../contexts/ThemeContext';
import { SURFACE_RADIUS, type AppPalette } from '../theme/palettes';

export interface CustomTooltipTutorialStep {
  id: string;
  title: string;
  description: string;
}

/** Centro e raio do destaque, em coordenadas da tela (modal edge-to-edge). */
export interface CustomTooltipTutorialAnchor {
  x: number;
  y: number;
  radius: number;
}

interface CustomTooltipTutorialProps {
  visible: boolean;
  steps: CustomTooltipTutorialStep[];
  resolveAnchor: (stepId: string, screen: { width: number; height: number }) => CustomTooltipTutorialAnchor | null;
  nextLabel: string;
  finishLabel: string;
  skipLabel: string;
  onSkip: () => void;
  onFinish: () => void;
}

const CARD_MAX_WIDTH = 300;
const SCREEN_MARGIN = 12;
const ANCHOR_GAP = 16;
const ARROW_SIZE = 12;
const DIM_BORDER = 2000;

export function CustomTooltipTutorial({
  visible,
  steps,
  resolveAnchor,
  nextLabel,
  finishLabel,
  skipLabel,
  onSkip,
  onFinish,
}: CustomTooltipTutorialProps) {
  const styles = useThemedStyles(createStyles);
  const [index, setIndex] = useState(0);
  const [screen, setScreen] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  const step = steps[index];
  const anchor = step && screen ? resolveAnchor(step.id, screen) : null;
  const isLast = index === steps.length - 1;

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setScreen((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
  };

  let cardStyle: object = {};
  let arrowStyle: object = {};
  if (anchor && screen) {
    const cardWidth = Math.min(CARD_MAX_WIDTH, screen.width - SCREEN_MARGIN * 2);
    const left = Math.min(
      Math.max(anchor.x - cardWidth / 2, SCREEN_MARGIN),
      screen.width - cardWidth - SCREEN_MARGIN
    );
    const arrowLeft = Math.min(Math.max(anchor.x - left - ARROW_SIZE / 2, 16), cardWidth - 16 - ARROW_SIZE);
    const below = anchor.y < screen.height / 2;
    cardStyle = below
      ? { width: cardWidth, left, top: anchor.y + anchor.radius + ANCHOR_GAP }
      : { width: cardWidth, left, bottom: screen.height - anchor.y + anchor.radius + ANCHOR_GAP };
    arrowStyle = below
      ? { left: arrowLeft, top: -ARROW_SIZE / 2 }
      : { left: arrowLeft, bottom: -ARROW_SIZE / 2 };
  }

  return (
    <Modal
      visible={visible && Boolean(step)}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onSkip}
    >
      <View style={styles.root} onLayout={handleLayout}>
        {anchor ? (
          <>
            <View
              pointerEvents="none"
              style={[
                styles.spotlight,
                {
                  left: anchor.x - anchor.radius - DIM_BORDER,
                  top: anchor.y - anchor.radius - DIM_BORDER,
                  width: (anchor.radius + DIM_BORDER) * 2,
                  height: (anchor.radius + DIM_BORDER) * 2,
                  borderRadius: anchor.radius + DIM_BORDER,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  left: anchor.x - anchor.radius,
                  top: anchor.y - anchor.radius,
                  width: anchor.radius * 2,
                  height: anchor.radius * 2,
                  borderRadius: anchor.radius,
                },
              ]}
            />
            <View style={[styles.card, cardStyle]} accessibilityRole="alert">
              <View style={[styles.arrow, arrowStyle]} />
              <Text style={styles.counter}>
                {index + 1} de {steps.length}
              </Text>
              <Text style={styles.title}>{step?.title}</Text>
              <Text style={styles.description}>{step?.description}</Text>
              <View style={styles.actions}>
                <Button variant="ghost" size="sm" responsive={false} onPress={onSkip}>
                  {skipLabel}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  responsive={false}
                  onPress={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
                >
                  {isLast ? finishLabel : nextLabel}
                </Button>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.dimOnly} />
        )}
      </View>
    </Modal>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      overflow: 'hidden',
    },
    dimOnly: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    spotlight: {
      position: 'absolute',
      borderWidth: DIM_BORDER,
      borderColor: 'rgba(0,0,0,0.55)',
    },
    ring: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: c.secondary.main,
    },
    card: {
      position: 'absolute',
      backgroundColor: c.background.paper,
      borderRadius: SURFACE_RADIUS,
      borderWidth: 1,
      borderColor: c.divider,
      padding: 16,
    },
    arrow: {
      position: 'absolute',
      width: ARROW_SIZE,
      height: ARROW_SIZE,
      backgroundColor: c.background.paper,
      transform: [{ rotate: '45deg' }],
    },
    counter: {
      fontSize: 12,
      color: c.text.secondary,
    },
    title: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: '700',
      color: c.text.primary,
    },
    description: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: c.text.secondary,
    },
    actions: {
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
  });
