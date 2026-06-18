import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { MarketplaceSliderData, MarketplaceSliderItem } from '../../../config/shops/marketplace-slider/types'
import { MARKETPLACE_SLIDER_AUTO_SCROLL_MS } from '../../../constants/marketplace-slider'
import { marketplaceSliderApi } from '../../../services/shops/marketplace-slider'
import { COLORS } from '../../../theme/colors'
import { ShopPromotionSliderCard } from './ShopPromotionSliderCard'
import { ShopPromotionPlaceholderCard } from './ShopPromotionPlaceholderCard'

type MarketplacePromotedShopsSliderProps = {
  showAdultContent: boolean
}

type SliderSlide =
  | { kind: 'promotion'; item: MarketplaceSliderItem }
  | { kind: 'placeholder' }

function buildSlides(
  items: MarketplaceSliderItem[],
  placeholderEnabled: boolean
): SliderSlide[] {
  if (items.length === 0) {
    return placeholderEnabled ? [{ kind: 'placeholder' }] : []
  }
  if (!placeholderEnabled) {
    return items.map((item) => ({ kind: 'promotion', item }))
  }
  const slides: SliderSlide[] = []
  for (const item of items) {
    slides.push({ kind: 'promotion', item })
    slides.push({ kind: 'placeholder' })
  }
  return slides
}

export function MarketplacePromotedShopsSlider({
  showAdultContent,
}: MarketplacePromotedShopsSliderProps) {
  const [loading, setLoading] = useState(true)
  const [sliderData, setSliderData] = useState<MarketplaceSliderData | null>(null)
  const [slideIndex, setSlideIndex] = useState(0)

  const fetchSlider = useCallback(async () => {
    setLoading(true)
    try {
      const response = await marketplaceSliderApi.getSlider(showAdultContent)
      if (response.success && response.data) {
        setSliderData(response.data)
      } else {
        setSliderData({
          items: [],
          placeholderEnabled: true,
          autoScrollMs: MARKETPLACE_SLIDER_AUTO_SCROLL_MS,
          placeholderShowText: true,
        })
      }
    } catch {
      setSliderData({
        items: [],
        placeholderEnabled: true,
        autoScrollMs: MARKETPLACE_SLIDER_AUTO_SCROLL_MS,
        placeholderShowText: true,
      })
    } finally {
      setLoading(false)
    }
  }, [showAdultContent])

  useEffect(() => {
    void fetchSlider()
  }, [fetchSlider])

  const slides = useMemo(
    () => buildSlides(sliderData?.items ?? [], sliderData?.placeholderEnabled !== false),
    [sliderData]
  )

  const autoScrollMs = sliderData?.autoScrollMs ?? MARKETPLACE_SLIDER_AUTO_SCROLL_MS

  useEffect(() => {
    setSlideIndex(0)
  }, [slides.length, showAdultContent])

  useEffect(() => {
    if (slides.length <= 1) return undefined
    const timer = setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length)
    }, autoScrollMs)
    return () => clearInterval(timer)
  }, [slides.length, autoScrollMs])

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.skeleton}>
          <ActivityIndicator size="small" color={COLORS.secondary.main} />
        </View>
      </View>
    )
  }

  if (slides.length === 0) return null

  const currentSlide = slides[slideIndex]

  const goPrev = () => {
    setSlideIndex((current) => (current - 1 + slides.length) % slides.length)
  }

  const goNext = () => {
    setSlideIndex((current) => (current + 1) % slides.length)
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.slideContainer}>
        {currentSlide.kind === 'promotion' ? (
          <ShopPromotionSliderCard item={currentSlide.item} />
        ) : (
          <ShopPromotionPlaceholderCard
            imageUrl={sliderData?.placeholderImageUrl}
            showText={sliderData?.placeholderShowText !== false}
          />
        )}

        {slides.length > 1 ? (
          <>
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnLeft]}
              onPress={goPrev}
              accessibilityLabel="Slide anterior"
            >
              <Ionicons name="chevron-back" size={18} color={COLORS.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnRight]}
              onPress={goNext}
              accessibilityLabel="Próximo slide"
            >
              <Ionicons name="chevron-forward" size={18} color={COLORS.text.primary} />
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  skeleton: {
    minHeight: 148,
    borderRadius: 12,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContainer: {
    position: 'relative',
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    zIndex: 2,
  },
  navBtnLeft: {
    left: 6,
  },
  navBtnRight: {
    right: 6,
  },
})
