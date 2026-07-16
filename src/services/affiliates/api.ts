import { AFFILIATES_API } from '../../config/affiliates/api-paths'
import type { ApiResponse } from '../shared/types'
import { api } from '../http-client'
import type {
  AffiliateAnalyticsData,
  AffiliateAnalyticsPeriod,
  AffiliateMeData,
  AffiliatePlatformPayload,
  AffiliateUploadData,
} from './types'

export const affiliatesApi = {
  getMe: async () => {
    const response = await api.get<ApiResponse<AffiliateMeData>>(AFFILIATES_API.me)
    return response.data
  },

  apply: async (payload: {
    notes?: string | null
    platforms: AffiliatePlatformPayload[]
  }) => {
    const response = await api.post<ApiResponse<{ _id: string; status: string }>>(
      AFFILIATES_API.apply,
      payload
    )
    return response.data
  },

  getUploadUrl: async (params: {
    fileName: string
    fileType: string
    fileSize: number
  }) => {
    const qs = new URLSearchParams({
      fileName: params.fileName,
      fileType: params.fileType,
      fileSize: String(params.fileSize),
    })
    const response = await api.get<ApiResponse<AffiliateUploadData>>(
      `${AFFILIATES_API.upload}?${qs.toString()}`
    )
    return response.data
  },

  getAnalytics: async (params?: {
    period?: AffiliateAnalyticsPeriod
    month?: string
  }) => {
    const qs = new URLSearchParams()
    if (params?.period) qs.set('period', params.period)
    if (params?.month) qs.set('month', params.month)
    const url = `${AFFILIATES_API.analytics}${qs.toString() ? `?${qs.toString()}` : ''}`
    const response = await api.get<ApiResponse<AffiliateAnalyticsData>>(url)
    return response.data
  },
}
