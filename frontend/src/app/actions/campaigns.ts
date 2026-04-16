'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'
import {
  Campaign,
  TrafficCampaignObjective,
  MetaAdAccount,
} from '@/lib/definitions'

export type MetaConfigInfo = {
  appId: string
  bmId: string
  ownAdAccountId: string | null
  ownAdAccountName: string | null
  updatedAt: string
  createdAt: string
}

export type MetaBmAdAccount = {
  id: string
  name: string
  currency: string
  accountStatus: number
}

export async function getAdminMetaConfig(): Promise<MetaConfigInfo | null> {
  try {
    return await apiServer.get<MetaConfigInfo>('/api/v1/admin/meta-config')
  } catch {
    return null
  }
}

export async function listBmAdAccounts(): Promise<MetaBmAdAccount[]> {
  try {
    const res = await apiServer.get<{ accounts: MetaBmAdAccount[] }>('/api/v1/admin/meta-config/ad-accounts')
    return res.accounts
  } catch {
    return []
  }
}

export async function saveAdminMetaConfig(data: {
  appId: string
  appSecret: string
  systemUserToken: string
  bmId: string
  ownAdAccountId?: string | null
  ownAdAccountName?: string | null
}): Promise<{ message?: string }> {
  try {
    try {
      await apiServer.post('/api/v1/admin/meta-config', data)
    } catch {
      await apiServer.patch('/api/v1/admin/meta-config', data)
    }
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

function revalidateCampaigns(customerId: string) {
  revalidatePath(`/customers/${customerId}/traffic`)
}

function revalidateCampaign(customerId: string, campaignId: string) {
  revalidatePath(`/customers/${customerId}/traffic/campaigns/${campaignId}`)
  revalidateCampaigns(customerId)
}

export async function listCampaigns(
  customerId: string,
  params?: { status?: string; publishStatus?: string },
): Promise<Campaign[]> {
  try {
    const query = new URLSearchParams({ limit: '50' })
    if (params?.status) query.set('status', params.status)
    if (params?.publishStatus) query.set('publishStatus', params.publishStatus)
    const res = await apiServer.get<{ items: Campaign[]; total: number }>(
      `/api/v1/customers/${customerId}/campaigns?${query}`,
    )
    return res.items
  } catch {
    return []
  }
}

export async function getCampaign(
  customerId: string,
  campaignId: string,
): Promise<Campaign | null> {
  try {
    return await apiServer.get<Campaign>(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}`,
    )
  } catch {
    return null
  }
}

export async function createCampaign(
  customerId: string,
  data: {
    name: string
    objective: TrafficCampaignObjective
    plannedBudget?: number
    dailyBudget?: number
    startAt?: string
    endAt?: string
    notes?: string
  },
): Promise<{ campaignId?: string; message?: string }> {
  try {
    const res = await apiServer.post<{ campaignId: string }>(
      `/api/v1/customers/${customerId}/campaigns`,
      data,
    )
    revalidateCampaigns(customerId)
    return { campaignId: res.campaignId }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function updateCampaign(
  customerId: string,
  campaignId: string,
  data: object,
): Promise<{ message?: string }> {
  try {
    await apiServer.patch(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}`,
      data,
    )
    revalidateCampaign(customerId, campaignId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function markCampaignReady(
  customerId: string,
  campaignId: string,
): Promise<{ message?: string }> {
  try {
    await apiServer.post(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/mark-ready`,
      {},
    )
    revalidateCampaign(customerId, campaignId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function publishCampaign(
  customerId: string,
  campaignId: string,
): Promise<{ message?: string }> {
  try {
    await apiServer.post(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/publish`,
      {},
    )
    revalidateCampaign(customerId, campaignId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function syncCampaignMetrics(
  customerId: string,
  campaignId: string,
): Promise<{ message?: string }> {
  try {
    await apiServer.post(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/sync`,
      {},
    )
    revalidateCampaign(customerId, campaignId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function archiveCampaign(
  customerId: string,
  campaignId: string,
): Promise<{ message?: string }> {
  try {
    await apiServer.post(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/archive`,
      {},
    )
    revalidateCampaign(customerId, campaignId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function resumeCampaign(
  customerId: string,
  campaignId: string,
): Promise<{ message?: string }> {
  try {
    await apiServer.post(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/resume`,
      {},
    )
    revalidateCampaign(customerId, campaignId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function pauseCampaign(
  customerId: string,
  campaignId: string,
): Promise<{ message?: string }> {
  try {
    await apiServer.post(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/pause`,
      {},
    )
    revalidateCampaign(customerId, campaignId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function createAdSet(
  customerId: string,
  campaignId: string,
  data: object,
): Promise<{ adSetId?: string; message?: string }> {
  try {
    const res = await apiServer.post<{ adSetId: string }>(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/ad-sets`,
      data,
    )
    revalidateCampaign(customerId, campaignId)
    return { adSetId: res.adSetId }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function updateAdSet(
  customerId: string,
  campaignId: string,
  adSetId: string,
  data: object,
): Promise<{ message?: string }> {
  try {
    await apiServer.patch(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/ad-sets/${adSetId}`,
      data,
    )
    revalidateCampaign(customerId, campaignId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function deleteAdSet(
  customerId: string,
  campaignId: string,
  adSetId: string,
): Promise<void> {
  await apiServer.delete(
    `/api/v1/customers/${customerId}/campaigns/${campaignId}/ad-sets/${adSetId}`,
  )
  revalidateCampaign(customerId, campaignId)
}

export async function createAd(
  customerId: string,
  campaignId: string,
  adSetId: string,
  data: object,
): Promise<{ adId?: string; message?: string }> {
  try {
    const res = await apiServer.post<{ adId: string }>(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/ad-sets/${adSetId}/ads`,
      data,
    )
    revalidateCampaign(customerId, campaignId)
    return { adId: res.adId }
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function updateAd(
  customerId: string,
  campaignId: string,
  adSetId: string,
  adId: string,
  data: object,
): Promise<{ message?: string }> {
  try {
    await apiServer.patch(
      `/api/v1/customers/${customerId}/campaigns/${campaignId}/ad-sets/${adSetId}/ads/${adId}`,
      data,
    )
    revalidateCampaign(customerId, campaignId)
    return {}
  } catch (err) {
    return { message: (err as Error).message }
  }
}

export async function deleteAd(
  customerId: string,
  campaignId: string,
  adSetId: string,
  adId: string,
): Promise<void> {
  await apiServer.delete(
    `/api/v1/customers/${customerId}/campaigns/${campaignId}/ad-sets/${adSetId}/ads/${adId}`,
  )
  revalidateCampaign(customerId, campaignId)
}

export async function saveMetaAdAccount(
  customerId: string,
  data: object,
): Promise<{ message?: string }> {
  try {
    await apiServer.post(`/api/v1/customers/${customerId}/meta-account`, data)
    revalidateCampaigns(customerId)
    return {}
  } catch (err) {
    // Try PATCH if POST fails (account may already exist)
    try {
      await apiServer.patch(`/api/v1/customers/${customerId}/meta-account`, data)
      revalidateCampaigns(customerId)
      return {}
    } catch (err2) {
      return { message: (err2 as Error).message }
    }
  }
}

export async function getMetaAdAccount(customerId: string): Promise<MetaAdAccount | null> {
  try {
    return await apiServer.get<MetaAdAccount>(`/api/v1/customers/${customerId}/meta-account`)
  } catch {
    return null
  }
}
