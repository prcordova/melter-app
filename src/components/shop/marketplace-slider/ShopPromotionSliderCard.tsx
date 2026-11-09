import React from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  type ImageSourcePropType,
  useWindowDimensions,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import type { MarketplaceSliderItem } from '../../../config/shops/marketplace-slider/types'
import { marketplaceSliderApi } from '../../../services/shops/marketplace-slider'
import { getImageUrl } from '../../../utils/image'
import { useAppTheme, useThemedStyles } from '../../../contexts/ThemeContext'
import type { AppPalette } from '../../../theme/palettes'
import {
  MARKETPLACE_SLIDER_ACTION_INSET,
  MARKETPLACE_SLIDER_HEIGHT,
} from '../../../constants/marketplace-slider'
import { Button } from '../../Button'

type ShopPromotionSliderCardProps = {
  item: MarketplaceSliderItem
}

export function ShopPromotionSliderCard({ item }: ShopPromotionSliderCardProps) {
  const { colors } = useAppTheme()
  const styles = useThemedStyles(createStyles)
  const navigation = useNavigation<any>()
  const { width } = useWindowDimensions()
  const actionInset = width < 600
    ? MARKETPLACE_SLIDER_ACTION_INSET.compact
    : MARKETPLACE_SLIDER_ACTION_INSET.regular
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
    <View style={styles.card}>
      <TouchableOpacity style={styles.coverWrap} activeOpacity={0.9} onPress={handlePress}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverFallback]} />
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.body} activeOpacity={0.9} onPress={handlePress}>
        <View style={styles.userRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri } as ImageSourcePropType} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={14} color={colors.text.tertiary} />
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
      </TouchableOpacity>

      <View style={[styles.actionWrap, { right: actionInset, bottom: actionInset }]}>
        <Button size="sm" onPress={handlePress} style={styles.actionButton}>
          Ver mais
        </Button>
      </View>
    </View>
  )
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    minHeight: MARKETPLACE_SLIDER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: c.background.paper,
    borderWidth: 1,
    borderColor: c.border.light,
    position: 'relative',
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
    backgroundColor: `${c.primary.main}22`,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 88,
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
    backgroundColor: c.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: c.text.primary,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text.primary,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    color: c.text.secondary,
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
    borderColor: c.states.error,
  },
  chipAi: {
    borderColor: c.states.info,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.text.secondary,
  },
  actionWrap: {
    position: 'absolute',
    zIndex: 2,
  },
  actionButton: {
    minWidth: 0,
  },
})
