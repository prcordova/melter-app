import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { COLORS } from '../../theme/colors'

export type PromotionsHubSection = 'ads' | 'shop'

type PromotionsHubPickerProps = {
  section: PromotionsHubSection
  onChange: (section: PromotionsHubSection) => void
}

export function PromotionsHubPicker({ section, onChange }: PromotionsHubPickerProps) {
  return (
    <View style={styles.row}>
      <HubCard
        icon="megaphone-outline"
        title="Anúncios no feed"
        description="Campanhas no feed da plataforma"
        selected={section === 'ads'}
        onPress={() => onChange('ads')}
      />
      <HubCard
        icon="storefront-outline"
        title="Promoções da loja"
        description="Destaque no slider do marketplace"
        selected={section === 'shop'}
        onPress={() => onChange('shop')}
      />
    </View>
  )
}

function HubCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string
  description: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={icon}
        size={22}
        color={selected ? COLORS.secondary.main : COLORS.text.secondary}
      />
      <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>{title}</Text>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {description}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    gap: 4,
  },
  cardSelected: {
    borderColor: COLORS.secondary.main,
    backgroundColor: `${COLORS.secondary.main}10`,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  cardTitleSelected: {
    color: COLORS.secondary.main,
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
})
