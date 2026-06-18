import React from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  type ImageSourcePropType,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import type { MarketplaceSliderItem } from '../../../config/shops/marketplace-slider/types'
import { marketplaceSliderApi } from '../../../services/shops/marketplace-slider'
import { getImageUrl } from '../../../utils/image'
import { COLORS } from '../../../theme/colors'
import { MARKETPLACE_SLIDER_HEIGHT } from '../../../constants/marketplace-slider'

type ShopPromotionSliderCardProps = {
  item: MarketplaceSliderItem
}

export function ShopPromotionSliderCard({ item }: ShopPromotionSliderCardProps) {
  const navigation = useNavigation<any>()
  const coverUri = item.coverUrl ? getImageUrl(item.coverUrl) : null
  const avatarUri = item.avatar ? getImageUrl(item.avatar) : null

  const handlePress = () => {
    void marketplaceSliderApi.recordClick(item.promotionId).catch(() => undefined)
    navigation.navigate('ProfileStack', {
      screen: 'MyShop',
      params: { username: item.username },
    })
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={handlePress}
      accessibilityRole="button"
    >
      <View style={styles.coverWrap}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverFallback]} />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.userRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri } as ImageSourcePropType} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={14} color={COLORS.text.tertiary} />
            </View>
          )}
          <Text style={styles.username} numberOfLines={1}>
            @{item.username}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.subtitle} numberOfLines={2}>
          Pacote em destaque no marketplace
        </Text>

        <View style={styles.chips}>
          {item.isAdultContent ? (
            <View style={[styles.chip, styles.chipAdult]}>
              <Text style={styles.chipText}>+18</Text>
            </View>
          ) : null}
          {item.isAiContent ? (
            <View style={[styles.chip, styles.chipAi]}>
              <Text style={styles.chipText}>IA</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    minHeight: MARKETPLACE_SLIDER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  coverWrap: {
    width: '34%',
    minWidth: 108,
    maxWidth: 140,
  },
  cover: {
    width: '100%',
    height: '100%',
    minHeight: MARKETPLACE_SLIDER_HEIGHT,
  },
  coverFallback: {
    backgroundColor: `${COLORS.primary.main}22`,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: {
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipAdult: {
    borderColor: COLORS.states.error,
  },
  chipAi: {
    borderColor: COLORS.states.info,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
})
