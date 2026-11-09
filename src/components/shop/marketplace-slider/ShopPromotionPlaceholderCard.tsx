import React from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import { getImageUrl } from '../../../utils/image'
import { useAppTheme, useThemedStyles } from '../../../contexts/ThemeContext'
import type { AppPalette } from '../../../theme/palettes'
import {
  MARKETPLACE_SLIDER_COMPACT_HEIGHT,
  MARKETPLACE_SLIDER_HEIGHT,
} from '../../../constants/marketplace-slider'

type ShopPromotionPlaceholderCardProps = {
  imageUrl?: string | null
  showText?: boolean
  /** Sem promoções ativas: faixa baixa em vez da altura do slider. */
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
        <View style={[styles.content, compact && styles.contentCompact]}>
          <Ionicons
            name="megaphone-outline"
            size={compact ? 20 : 22}
            color={hasImage ? '#fff' : colors.text.primary}
          />
          <View style={styles.textWrap}>
            <Text style={[styles.title, hasImage && styles.titleOnImage]}>Anuncie aqui</Text>
            <Text
              style={[styles.description, hasImage && styles.descriptionOnImage]}
              numberOfLines={compact ? 1 : 2}
            >
              Destaque seus pacotes no topo do marketplace.
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={hasImage ? '#fff' : colors.text.secondary}
          />
        </View>
      ) : null}
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
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contentCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
  },
  descriptionOnImage: {
    color: 'rgba(255,255,255,0.92)',
  },
})
