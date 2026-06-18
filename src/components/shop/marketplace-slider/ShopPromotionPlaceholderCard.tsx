import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import { getImageUrl } from '../../../utils/image'
import { COLORS } from '../../../theme/colors'
import { MARKETPLACE_SLIDER_HEIGHT } from '../../../constants/marketplace-slider'

type ShopPromotionPlaceholderCardProps = {
  imageUrl?: string | null
  showText?: boolean
}

export function ShopPromotionPlaceholderCard({
  imageUrl,
  showText = true,
}: ShopPromotionPlaceholderCardProps) {
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
      style={[styles.card, hasImage && styles.cardWithImage]}
      activeOpacity={0.9}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Anuncie aqui no marketplace"
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
              size={22}
              color={hasImage ? '#fff' : COLORS.text.primary}
            />
            <Text style={[styles.title, hasImage && styles.titleOnImage]}>Anuncie aqui</Text>
          </View>
          <Text style={[styles.description, hasImage && styles.descriptionOnImage]} numberOfLines={2}>
            Destaque seus pacotes no topo do marketplace e alcance mais compradores.
          </Text>
          <Text style={[styles.cta, hasImage && styles.ctaOnImage]}>Promover agora →</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    minHeight: MARKETPLACE_SLIDER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: `${COLORS.primary.main}14`,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    justifyContent: 'center',
  },
  cardWithImage: {
    backgroundColor: '#111',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  gradientFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${COLORS.secondary.main}12`,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    color: COLORS.text.primary,
  },
  titleOnImage: {
    color: '#fff',
  },
  description: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  descriptionOnImage: {
    color: 'rgba(255,255,255,0.92)',
  },
  cta: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.secondary.main,
    marginTop: 2,
  },
  ctaOnImage: {
    color: COLORS.secondary.light ?? '#b8a0ff',
  },
})
