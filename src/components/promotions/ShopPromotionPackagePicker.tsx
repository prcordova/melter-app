import React, { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ShopPromotionPackageTier } from '../../constants/marketplace-slider'
import type { ShopPromotionPackageOffer } from '../../lib/shops/marketplace-slider/pricing'
import { COLORS } from '../../theme/colors'

const TRACK_WIDTH = 220

function daysChipLabel(calendarDays: number): string {
  if (calendarDays === 1) return '1 dia'
  return `${calendarDays} dias`
}

function markPositionPercent(index: number, total: number): number {
  if (total <= 1) return 50
  return (index / (total - 1)) * 100
}

type ShopPromotionPackagePickerProps = {
  offers: ShopPromotionPackageOffer[]
  value: ShopPromotionPackageTier
  onChange: (tier: ShopPromotionPackageTier) => void
  label?: string
}

export function ShopPromotionPackagePicker({
  offers,
  value,
  onChange,
  label,
}: ShopPromotionPackagePickerProps) {
  const selectedIndex = useMemo(() => {
    const index = offers.findIndex((offer) => offer.tier === value)
    return index >= 0 ? index : Math.min(1, Math.max(0, offers.length - 1))
  }, [offers, value])

  const selectedOffer = offers[selectedIndex]

  const setIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(offers.length - 1, index))
    const offer = offers[clamped]
    if (offer) onChange(offer.tier)
  }

  if (offers.length === 0 || !selectedOffer) {
    return null
  }

  const atMin = selectedIndex <= 0
  const atMax = selectedIndex >= offers.length - 1
  const showDiscount = selectedOffer.savingsPercent > 0
  const fillWidth = markPositionPercent(selectedIndex, offers.length)

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Text style={styles.selectedLabel}>{daysChipLabel(selectedOffer.calendarDays)}</Text>

      <View style={[styles.discountRow, { width: TRACK_WIDTH }]}>
        {offers.map((offer, index) => (
          <View
            key={offer.tier}
            style={[
              styles.discountSlot,
              { left: `${markPositionPercent(index, offers.length)}%` },
            ]}
          >
            {offer.savingsPercent > 0 ? (
              <Text style={styles.markDiscount}>-{offer.savingsPercent}%</Text>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => setIndex(selectedIndex - 1)}
          disabled={atMin}
          style={[styles.stepButton, atMin && styles.stepButtonDisabled]}
          hitSlop={8}
        >
          <Ionicons
            name="remove-circle-outline"
            size={28}
            color={atMin ? COLORS.text.tertiary : COLORS.secondary.main}
          />
        </Pressable>

        <View style={[styles.track, { width: TRACK_WIDTH }]}>
          <View style={styles.rail} />
          <View style={[styles.trackFill, { width: `${fillWidth}%` }]} />
          {offers.map((offer, index) => (
            <Pressable
              key={offer.tier}
              onPress={() => setIndex(index)}
              style={[
                styles.dotHit,
                { left: `${markPositionPercent(index, offers.length)}%` },
              ]}
              hitSlop={10}
            >
              <View style={[styles.dot, index === selectedIndex && styles.dotActive]} />
            </Pressable>
          ))}
          <View
            style={[styles.thumb, { left: `${fillWidth}%` }]}
            pointerEvents="none"
          />
        </View>

        <Pressable
          onPress={() => setIndex(selectedIndex + 1)}
          disabled={atMax}
          style={[styles.stepButton, atMax && styles.stepButtonDisabled]}
          hitSlop={8}
        >
          <Ionicons
            name="add-circle-outline"
            size={28}
            color={atMax ? COLORS.text.tertiary : COLORS.secondary.main}
          />
        </Pressable>
      </View>

      <Text
        style={[styles.discountHint, !showDiscount && styles.discountHintHidden]}
        numberOfLines={2}
      >
        {showDiscount
          ? `${selectedOffer.savingsPercent}% de desconto neste pacote · economiza R$ ${selectedOffer.savingsAmount.toFixed(2)}`
          : ' '}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  discountRow: {
    position: 'relative',
    height: 18,
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'center',
  },
  discountSlot: {
    position: 'absolute',
    transform: [{ translateX: -18 }],
    width: 36,
    alignItems: 'center',
  },
  markDiscount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.states.success,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  stepButton: {
    padding: 2,
  },
  stepButtonDisabled: {
    opacity: 0.45,
  },
  track: {
    height: 28,
    justifyContent: 'center',
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border.medium,
    opacity: 0.45,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.secondary.main,
  },
  dotHit: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
    top: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border.dark,
  },
  dotActive: {
    backgroundColor: COLORS.secondary.main,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    top: 5,
    backgroundColor: COLORS.secondary.main,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  discountHint: {
    marginTop: 8,
    minHeight: 32,
    maxWidth: TRACK_WIDTH + 40,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.states.success,
    textAlign: 'center',
    lineHeight: 16,
  },
  discountHintHidden: {
    opacity: 0,
  },
})
