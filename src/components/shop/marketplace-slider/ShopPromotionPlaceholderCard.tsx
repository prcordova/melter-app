import React from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import { getImageUrl } from '../../../utils/image'
import { useAppTheme, useThemedStyles } from '../../../contexts/ThemeContext'
import type { AppPalette } from '../../../theme/palettes'
import { Button } from '../../Button'
import {
  MARKETPLACE_SLIDER_ACTION_INSET,
  MARKETPLACE_SLIDER_COMPACT_HEIGHT,
  MARKETPLACE_SLIDER_HEIGHT,
} from '../../../constants/marketplace-slider'

type ShopPromotionPlaceholderCardProps = {
  imageUrl?: string | null
  showText?: boolean
  /** Sem promoções ativas: altura reduzida em vez da altura do slider. */
  compact?: boolean
}

export function ShopPromotionPlaceholderCard({
  imageUrl,
  showText = true,
  compact = false,
}: ShopPromotionPlaceholderCardProps) {
  const { colors } = useAppTheme()
  const styles = useThemedStyles(createStyles)
  const navigation = useNavigation<any>()
  const resolvedImage = imageUrl ? getImageUrl(imageUrl) : null
  const hasImage = Boolean(resolvedImage)
  const actionInset = compact ? MARKETPLACE_SLIDER_ACTION_INSET.compact : MARKETPLACE_SLIDER_ACTION_INSET.regular

  const handlePress = () => {
    navigation.navigate('ProfileStack', {
      screen: 'PromotionsSettings',
      params: { hubSection: 'shop', openCreate: true },
    })
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Anuncie aqui"
      style={[
        styles.card,
        { minHeight: compact ? MARKETPLACE_SLIDER_COMPACT_HEIGHT : MARKETPLACE_SLIDER_HEIGHT },
        hasImage && styles.cardWithImage,
      ]}
    >
      {hasImage ? (
        <>
          <Image source={{ uri: resolvedImage! }} style={styles.bgImage} resizeMode="cover" />
          <View style={styles.imageOverlay} />
        </>
      ) : (
        <View style={styles.gradientFallback} />
      )}

      {showText ? (
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Ionicons
              name="megaphone-outline"
              size={20}
              color={hasImage ? '#fff' : colors.secondary.main}
            />
            <Text style={[styles.title, hasImage && styles.titleOnImage]}>Anuncie aqui</Text>
          </View>
          <Text style={[styles.description, hasImage && styles.descriptionOnImage]} numberOfLines={2}>
            Destaque seus pacotes no topo do marketplace.
          </Text>
        </View>
      ) : null}

      <View style={[styles.action, { right: actionInset, bottom: actionInset }]}>
        <Button size="sm" responsive={false} onPress={handlePress}>
          Promover
        </Button>
      </View>
    </TouchableOpacity>
  )
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: `${c.primary.main}14`,
    borderWidth: 1,
    borderColor: c.border.light,
    position: 'relative',
  },
  cardWithImage: {
    backgroundColor: '#111',
  },
  bgImage: {
    ...StyleSheet.absoluteFill,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  gradientFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: `${c.secondary.main}12`,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text.primary,
  },
  titleOnImage: {
    color: '#fff',
  },
  description: {
    fontSize: 12,
    color: c.text.secondary,
    lineHeight: 16,
    marginRight: 96,
  },
  descriptionOnImage: {
    color: 'rgba(255,255,255,0.92)',
  },
  action: {
    position: 'absolute',
    zIndex: 2,
  },
})
