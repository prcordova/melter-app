import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';

const BENEFITS = [
  'Painel de crescimento: receita, vendas e assinantes',
  'Produtos que mais vendem e conversão no checkout',
  'Demografia e origem do tráfego',
  'Indicadores para preço, promoções e publicações',
] as const;

export function ShopAnalyticsLockedPanel() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="analytics-outline" size={22} color={colors.secondary.main} />
        <Text style={styles.title}>Analytics da sua loja</Text>
      </View>
      <Text style={styles.description}>
        Com o plano PRO+, você acompanha vendas, visitas e o que melhorar para vender mais.
        Veja o que desbloqueia nos planos.
      </Text>
      {BENEFITS.map((line) => (
        <View key={line} style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.secondary.main} />
          <Text style={styles.benefitText}>{line}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={styles.cta}
        onPress={() => navigation.navigate('Plans' as never)}
      >
        <Text style={styles.ctaText}>Ver planos e desbloquear</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text.primary,
  },
  description: {
    fontSize: 14,
    color: c.text.secondary,
    lineHeight: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: c.text.primary,
  },
  cta: {
    marginTop: 8,
    backgroundColor: c.secondary.main,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
