import React from 'react'
import { View, Text, Image, StyleSheet, useWindowDimensions } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import { getImageUrl } from '../../../utils/image'
import { useAppTheme, useThemedStyles } from '../../../contexts/ThemeContext'
import type { AppPalette } from '../../../theme/palettes'
import {
  MARKETPLACE_SLIDER_ACTION_INSET,
  MARKETPLACE_SLIDER_HEIGHT,
} from '../../../constants/marketplace-slider'
import { Button } from '../../Button'

type ShopPromotionPlaceholderCardProps = {
  imageUrl?: string | null
  showText?: boolean
}

export function ShopPromotionPlaceholderCard({
  imageUrl,
  showText = true,
}: ShopPromotionPlaceholderCardProps) {
  const { colors } = useAppTheme()
  const styles = useThemedStyles(createStyles)
  const navigation = useNavigation<any>()
  const { width } = useWindowDimensions()
  const actionInset = width < 600
    ? MARKETPLACE_SLIDER_ACTION_INSET.compact
    : MARKETPLACE_SLIDER_ACTION_INSET.regular
  const resolvedImage = imageUrl ? getImageUrl(imageUrl) : null
  const hasImage = Boolean(resolvedImage)

  const handlePromote = () => {
    navigation.navigate('ProfileStack', {
      screen: 'PromotionsSettings',
      params: { hubSection: 'shop', openCreate: true },
    })
  }

  return (
    <View style={[styles.card, hasImage && styles.cardWithImage]}>
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
              size={22}
              color={hasImage ? '#fff' : colors.text.primary}
            />
            <Text style={[styles.title, hasImage && styles.titleOnImage]}>Anuncie aqui</Text>
          </View>
          <Text style={[styles.description, hasImage && styles.descriptionOnImage]} numberOfLines={2}>
            Destaque seus pacotes no topo do marketplace e alcance mais compradores.
          </Text>
        </View>
      ) : null}

      <View style={[styles.actionWrap, { right: actionInset, bottom: actionInset }]}>
        <Button size="sm" onPress={handlePromote} style={styles.actionButton}>
          Saiba mais
        </Button>
      </View>
    </View>
  )
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  card: {
    minHeight: MARKETPLACE_SLIDER_HEIGHT,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 96,
    gap: 6,
    maxWidth: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: c.text.primary,
  },
  titleOnImage: {
    color: '#fff',
  },
  description: {
    fontSize: 13,
    color: c.text.secondary,
    lineHeight: 18,
  },
  descriptionOnImage: {
    color: 'rgba(255,255,255,0.92)',
  },
  actionWrap: {
    position: 'absolute',
    zIndex: 2,
  },
  actionButton: {
    minWidth: 0,
  },
})
