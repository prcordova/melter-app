export type PromotionProductOption = {
  _id: string
  createdAt?: string | Date
}

export function sortPromotionProductsByNewest<T extends PromotionProductOption>(
  products: T[]
): T[] {
  return [...products].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bTime - aTime
  })
}

export function resolveDefaultPromotionProductId(
  approvedProducts: PromotionProductOption[],
  preferredId?: string | null
): string {
  if (approvedProducts.length === 0) return ''

  const preferred = preferredId ? String(preferredId) : ''
  if (preferred && approvedProducts.some((p) => String(p._id) === preferred)) {
    return preferred
  }

  return String(approvedProducts[0]._id)
}
