import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from './Button';
import {
  DISCOVERY_MODE_LABELS,
  useDiscoveryPreference,
} from '../contexts/DiscoveryPreferenceContext';
import type { DiscoveryViewMode } from '../utils/explorer-discovery-personalization';

type DiscoveryModeTabsProps = {
  activeMode: DiscoveryViewMode;
  onModeChange: (mode: DiscoveryViewMode) => void;
};

export function DiscoveryModeTabs({ activeMode, onModeChange }: DiscoveryModeTabsProps) {
  const { preference } = useDiscoveryPreference();

  return (
    <View style={styles.row}>
      {preference.modeButtonOrder.map((mode) => (
        <Button
          key={mode}
          size="sm"
          variant={activeMode === mode ? 'primary' : 'outline'}
          onPress={() => {
            if (mode !== activeMode) onModeChange(mode);
          }}
          style={styles.button}
        >
          {DISCOVERY_MODE_LABELS[mode]}
        </Button>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  button: {
    minWidth: 0,
  },
});
