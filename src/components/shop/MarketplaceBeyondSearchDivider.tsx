import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';

const DIVIDER_COLOR = 'rgba(182, 51, 133, 0.45)';

type Props = {
  title?: string;
};

export function MarketplaceBeyondSearchDivider({
  title = 'Veja resultados além da sua busca',
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.line} />
      <Text style={styles.label}>{title}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
    paddingHorizontal: 4,
  },
  line: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: DIVIDER_COLOR,
  },
  label: {
    flexShrink: 1,
    maxWidth: '70%',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary.main,
    textAlign: 'center',
    lineHeight: 19,
  },
});
