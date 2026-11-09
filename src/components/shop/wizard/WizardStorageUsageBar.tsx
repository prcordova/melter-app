import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../contexts/ThemeContext';
import type { AppPalette } from '../../../theme/palettes';
import { useAuth } from '../../../contexts/AuthContext';
import {
  formatPlanStorageLimit,
  getProductCreationStorageLimits,
  resolveUserPlanType,
} from '../../../config/plan-features';
import type { ProductStorageOptions } from './ContentStep';

type WizardStorageUsageBarProps = {
  files?: Array<{ size?: number }>;
  storageOptions?: ProductStorageOptions;
};

/** Mesmo formato do web (`melter/utils/format-file-size.ts`). */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/** Barra fixa acima do rodapé do wizard: uso total de mídia × limite do plano. */
export function WizardStorageUsageBar({ files, storageOptions }: WizardStorageUsageBarProps) {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const storageLimits = getProductCreationStorageLimits(
    resolveUserPlanType(user?.plan?.type),
    storageOptions
  );

  const usedBytes = useMemo(
    () => (files ?? []).reduce((total, file) => total + (file.size || 0), 0),
    [files]
  );
  const maxBytes = storageLimits.maxTotalFileSizeBytes;
  const percent = maxBytes > 0 ? Math.min(100, (usedBytes / maxBytes) * 100) : 0;
  const isOver = usedBytes > maxBytes;
  const usageLabel = `${formatFileSize(usedBytes)} / ${formatPlanStorageLimit(storageLimits.maxTotalFileSizeMb)}`;

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Uso total: ${usageLabel}`}
    >
      <Text style={styles.label}>Uso total</Text>
      <View style={styles.track}>
        <View
          style={[styles.bar, isOver && styles.barOver, { width: `${percent}%` }]}
        />
      </View>
      <Text style={[styles.value, isOver && styles.valueOver]} numberOfLines={1}>
        {usageLabel}
      </Text>
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border.light,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: c.text.secondary,
    },
    track: {
      flex: 1,
      height: 8,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: c.background.tertiary,
    },
    bar: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: c.secondary.main,
    },
    barOver: {
      backgroundColor: c.states.error,
    },
    value: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text.primary,
    },
    valueOver: {
      color: c.states.error,
    },
  });
