'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

function revalidateCreatives(customerId: string) {
  revalidatePath(`/customers/${customerId}/creatives`)
}

function revalidateCreative(customerId: string, creativeId: string) {
  revalidatePath(`/customers/${customerId}/creatives/${creativeId}`)
  revalidateCreatives(customerId)
}

export async function createCreative(
  customerId: string,
  data: {
    title: string
    type: string
    stage?: string
    parentCreativeId?: string
    variationAspects?: string[]
    caption?: string
    textInCreative?: string
    designDescription?: string
    objective?: string
  },
): Promise<{ creativeId?: string; message?: string }> {
  try {
    const res = await apiServer.post<{ creativeId: string }>(
      `/api/v1/customers/${customerId}/creatives`,
      data,
    )
    revalidateCreatives(customerId)
    return { creativeId: res.creativeId }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function uploadCreativeFile(
  customerId: string,
  creativeId: string,
  formData: FormData,
): Promise<{ message?: string }> {
  try {
    await apiServer.upload(
      `/api/v1/customers/${customerId}/creatives/${creativeId}/file`,
      formData,
    )
    revalidateCreative(customerId, creativeId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function updateCreative(
  customerId: string,
  creativeId: string,
  data: {
    title?: string
    caption?: string | null
    textInCreative?: string | null
    designDescription?: string | null
    stage?: string | null
    parentCreativeId?: string | null
    variationAspects?: string[]
    objective?: string | null
    status?: string
  },
): Promise<{ message?: string }> {
  try {
    await apiServer.patch(
      `/api/v1/customers/${customerId}/creatives/${creativeId}`,
      data,
    )
    revalidateCreative(customerId, creativeId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function deleteCreative(customerId: string, creativeId: string): Promise<void> {
  await apiServer.delete(`/api/v1/customers/${customerId}/creatives/${creativeId}`)
  revalidateCreatives(customerId)
}

export async function addCreativePerformance(
  customerId: string,
  creativeId: string,
  data: {
    platform: string
    campaignId?: string
    impressions: number
    clicks: number
    conversions: number
    spend: number
    ctr?: number
    cpc?: number
    cpa?: number
    roas?: number
    startDate: string
    endDate?: string
    notes?: string
  },
): Promise<{ performanceId?: string; message?: string }> {
  try {
    const res = await apiServer.post<{ performanceId: string }>(
      `/api/v1/customers/${customerId}/creatives/${creativeId}/performances`,
      data,
    )
    revalidateCreative(customerId, creativeId)
    return { performanceId: res.performanceId }
  } catch (err) {
    return { message: (err as Error).message }
  }
}
