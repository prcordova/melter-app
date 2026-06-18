import React, { useEffect, useState } from 'react'
import { ShopPromotionModal } from './ShopPromotionModal'
import { ShopPromotionsList } from './ShopPromotionsList'

type PromotionsShopSectionProps = {
  autoOpenCreate?: boolean
  initialProductId?: string | null
  createOpen?: boolean
  onCreateOpenChange?: (open: boolean) => void
}

export function PromotionsShopSection({
  autoOpenCreate = false,
  initialProductId,
  createOpen: createOpenProp,
  onCreateOpenChange,
}: PromotionsShopSectionProps) {
  const [internalOpen, setInternalOpen] = useState(autoOpenCreate)
  const [refreshKey, setRefreshKey] = useState(0)

  const modalOpen = createOpenProp ?? internalOpen
  const setModalOpen = onCreateOpenChange ?? setInternalOpen

  useEffect(() => {
    if (autoOpenCreate) setModalOpen(true)
  }, [autoOpenCreate, setModalOpen])

  return (
    <>
      <ShopPromotionsList refreshKey={refreshKey} />

      <ShopPromotionModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        initialProductId={initialProductId}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </>
  )
}
