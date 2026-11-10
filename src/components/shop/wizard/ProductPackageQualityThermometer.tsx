import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../../contexts/ThemeContext';
import type { AppPalette } from '../../../theme/palettes';
import { useAuth } from '../../../contexts/AuthContext';
import {
  computePackageQuality,
  resolvePackageQualityRulerColor,
  type PackageQualityCriterion,
  type PackageQualityDimension,
  type PackageQualityFormInput,
  type PackageQualityLevel,
  type PackageQualityResult,
} from '../../../lib/products/product-package-quality';

type ProductPackageQualityThermometerProps = {
  formData: PackageQualityFormInput;
};

const RULER_COLORS = ['#EF5350', '#FF7043', '#FF9800', '#FFC107', '#66BB6A', '#2E7D32'] as const;
const RULER_LOCATIONS = [0, 0.18, 0.35, 0.55, 0.75, 1] as const;

const LEVEL_LABELS: Record<PackageQualityLevel, string> = {
  basic: 'Básico',
  starter: 'Inicial',
  good: 'Bom',
  excellent: 'Excelente',
};

const DIMENSION_LABELS: Record<PackageQualityDimension['id'], string> = {
  storage: 'Volume de mídia',
  images: 'Imagens',
  videos: 'Vídeos',
  presentation: 'Capa, texto e tags',
  price: 'Preço na média',
};

function dimensionValue(dimension: PackageQualityDimension): string {
  const { currentLabel: current, targetLabel: target } = dimension;
  switch (dimension.id) {
    case 'storage':
      return `${current} · excelente ~${target}`;
    case 'presentation':
      return `${current} capa`;
    case 'price':
      return `${current} · média ${target}`;
    default:
      return `${current} / pelo menos ${target}`;
  }
}

function tipText(tip: PackageQualityCriterion, quality: PackageQualityResult): string {
  const { targets } = quality;
  switch (tip) {
    case 'add_media':
      return 'Envie imagens ou vídeos do que você vende.';
    case 'add_storage':
      return `Use mais mídia — quem vende mais costuma ter pelo menos ${targets.storageMediumMb} MB (excelente ~${targets.storageExcellentMb} MB).`;
    case 'add_more_images':
      return `Adicione mais imagens (pelo menos ${targets.minImages}).`;
    case 'add_videos':
      return `Inclua vídeos (pelo menos ${targets.minVideos}).`;
    case 'add_cover':
      return 'Capa personalizada ajuda na vitrine.';
    case 'add_description':
      return 'Complete a descrição do pacote.';
    case 'improve_title':
      return 'Use um título mais descritivo.';
    case 'add_tags':
      return 'Tags melhoram a campanha (não são obrigatórias).';
    case 'set_average_price':
      return 'Preço na média: R$ 20 a R$ 150.';
  }
}

export function ProductPackageQualityThermometer({ formData }: ProductPackageQualityThermometerProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const planType = user?.plan?.type;

  const quality = useMemo(() => computePackageQuality(formData, planType), [formData, planType]);

  const markerColor = resolvePackageQualityRulerColor(quality.score);
  const levelLabel = LEVEL_LABELS[quality.level];
  const primaryTip = quality.tips[0];
  const hintLine =
    primaryTip != null ? tipText(primaryTip, quality) : 'Pacote bem completo para o seu plano.';
  const markerLeft = `${Math.min(97, Math.max(3, quality.score))}%` as const;

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`Qualidade do pacote: ${quality.score}%, nível ${levelLabel}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Qualidade</Text>
        <Text style={[styles.score, { color: markerColor }]}>
          {quality.score}% · {levelLabel}
        </Text>
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.toggleText}>{expanded ? 'Ocultar' : 'Detalhes'}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.rulerWrap}>
        <LinearGradient
          colors={RULER_COLORS}
          locations={RULER_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ruler}
        />
        <View style={[styles.marker, { left: markerLeft, borderColor: markerColor }]} />
      </View>

      <Text style={styles.hint} numberOfLines={2}>
        {hintLine}
      </Text>

      {expanded ? (
        <View style={styles.details}>
          <Text style={styles.planHint}>
            Capacidade do plano: até {quality.targets.maxTotalLabel} · referência:{' '}
            {quality.targets.storageWeakMb}/{quality.targets.storageMediumMb}/
            {quality.targets.storageExcellentMb} MB
          </Text>
          {quality.dimensions.map((dimension) => (
            <View key={dimension.id} style={styles.dimensionRow}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionLabel}>{DIMENSION_LABELS[dimension.id]}</Text>
                <Text style={styles.dimensionValue}>{dimensionValue(dimension)}</Text>
              </View>
              <View style={styles.dimensionTrack}>
                <View
                  style={[
                    styles.dimensionBar,
                    {
                      width: `${dimension.score}%`,
                      backgroundColor: resolvePackageQualityRulerColor(dimension.score),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    container: {
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border.light,
      backgroundColor: c.background.paper,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    title: {
      fontSize: 12,
      fontWeight: '600',
      color: c.text.secondary,
    },
    score: {
      fontSize: 12,
      fontWeight: '700',
    },
    toggle: {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    toggleText: {
      fontSize: 11,
      fontWeight: '500',
      color: c.text.secondary,
    },
    rulerWrap: {
      position: 'relative',
      marginBottom: 6,
      justifyContent: 'center',
    },
    ruler: {
      height: 8,
      borderRadius: 4,
    },
    marker: {
      position: 'absolute',
      top: -1,
      width: 4,
      height: 10,
      marginLeft: -2,
      borderRadius: 2,
      backgroundColor: '#ffffff',
      borderWidth: 1.5,
    },
    hint: {
      fontSize: 11,
      lineHeight: 15,
      color: c.text.secondary,
    },
    details: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.border.light,
      gap: 8,
    },
    planHint: {
      fontSize: 11,
      color: c.text.secondary,
    },
    dimensionRow: {
      gap: 3,
    },
    dimensionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    dimensionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.text.secondary,
    },
    dimensionValue: {
      fontSize: 11,
      color: c.text.secondary,
    },
    dimensionTrack: {
      height: 3,
      borderRadius: 1.5,
      overflow: 'hidden',
      backgroundColor: c.background.tertiary,
    },
    dimensionBar: {
      height: '100%',
      borderRadius: 1.5,
    },
  });
