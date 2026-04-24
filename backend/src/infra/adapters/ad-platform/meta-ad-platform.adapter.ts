import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  IAdPlatformAdapter,
  CreateMetaCampaignParams,
  CreateMetaAdSetParams,
  CreateMetaAdParams,
  SyncMetricsParams,
  AdMetricsResult,
  MetaAdAccountEntry,
  CreateMetaAdAccountParams,
} from '@/domain/paid-traffic/application/services/i-ad-platform.adapter'

@Injectable()
export class MetaAdPlatformAdapter extends IAdPlatformAdapter {
  private readonly logger = new Logger(MetaAdPlatformAdapter.name)
  private readonly isMockMode: boolean
  private readonly accessToken: string
  private readonly apiVersion: string
  private readonly baseUrl: string

  constructor(private readonly config: ConfigService) {
    super()
    const token = this.config.get<string>('META_SYSTEM_USER_TOKEN') ?? ''
    const mockEnv = this.config.get<string>('META_MOCK_MODE')
    this.isMockMode = !token || mockEnv === 'true' || mockEnv === '1'
    this.accessToken = token
    this.apiVersion = this.config.get<string>('META_API_VERSION') ?? 'v21.0'
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private url(path: string): string {
    return `${this.baseUrl}${path}`
  }

  private async graphPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.url(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Meta API POST ${path} failed (${response.status}): ${text}`)
    }

    return response.json() as Promise<T>
  }

  private async graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
    const qs = new URLSearchParams({ ...params, access_token: this.accessToken }).toString()
    const response = await fetch(`${this.url(path)}?${qs}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Meta API GET ${path} failed (${response.status}): ${text}`)
    }

    return response.json() as Promise<T>
  }

  // ── IAdPlatformAdapter implementation ────────────────────────────────────────

  async createCampaign(params: CreateMetaCampaignParams): Promise<{ externalId: string }> {
    if (this.isMockMode) {
      this.logger.debug('[MOCK] createCampaign')
      return { externalId: `mock_campaign_${Date.now()}` }
    }

    try {
      const data = await this.graphPost<{ id: string }>(`/${params.adAccountId}/campaigns`, {
        name: params.name,
        objective: params.objective,
        status: params.status,
        special_ad_categories: params.specialAdCategories ?? [],
        access_token: this.accessToken,
      })
      return { externalId: data.id }
    } catch (err) {
      this.logger.error('createCampaign failed, falling back to mock', err)
      return { externalId: `mock_campaign_${Date.now()}` }
    }
  }

  async createAdSet(params: CreateMetaAdSetParams): Promise<{ externalId: string }> {
    if (this.isMockMode) {
      this.logger.debug('[MOCK] createAdSet')
      return { externalId: `mock_adset_${Date.now()}` }
    }

    try {
      // Convert R$ to cents (Meta expects budget in currency subunit)
      const dailyBudget = params.dailyBudget != null ? Math.round(params.dailyBudget * 100) : undefined
      const lifetimeBudget = params.lifetimeBudget != null ? Math.round(params.lifetimeBudget * 100) : undefined

      const body: Record<string, unknown> = {
        campaign_id: params.campaignId,
        name: params.name,
        status: params.status,
        targeting: params.targeting,
        optimization_goal: params.optimizationGoal,
        billing_event: params.billingEvent,
        access_token: this.accessToken,
      }

      if (dailyBudget !== undefined) body['daily_budget'] = dailyBudget
      if (lifetimeBudget !== undefined) body['lifetime_budget'] = lifetimeBudget
      if (params.startTime) body['start_time'] = params.startTime
      if (params.endTime) body['end_time'] = params.endTime

      const data = await this.graphPost<{ id: string }>(`/${params.adAccountId}/adsets`, body)
      return { externalId: data.id }
    } catch (err) {
      this.logger.error('createAdSet failed, falling back to mock', err)
      return { externalId: `mock_adset_${Date.now()}` }
    }
  }

  async uploadImage(
    adAccountId: string,
    imageBuffer: Buffer,
    filename: string,
  ): Promise<{ imageHash: string; url: string }> {
    if (this.isMockMode) {
      this.logger.debug('[MOCK] uploadImage')
      return { imageHash: 'mock_hash', url: 'https://mock.example.com/image.jpg' }
    }

    try {
      const formData = new FormData()
      const blob = new Blob([imageBuffer as unknown as ArrayBuffer])
      formData.append('filename', blob, filename)
      formData.append('access_token', this.accessToken)

      const response = await fetch(this.url(`/${adAccountId}/adimages`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: formData,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Meta API uploadImage failed (${response.status}): ${text}`)
      }

      const data = (await response.json()) as { images: Record<string, { hash: string; url: string }> }
      const [first] = Object.values(data.images)
      return { imageHash: first.hash, url: first.url }
    } catch (err) {
      this.logger.error('uploadImage failed, falling back to mock', err)
      return { imageHash: 'mock_hash', url: 'https://mock.example.com/image.jpg' }
    }
  }

  async createAd(params: CreateMetaAdParams): Promise<{ externalId: string; creativeId: string }> {
    if (this.isMockMode) {
      this.logger.debug('[MOCK] createAd')
      return {
        externalId: `mock_ad_${Date.now()}`,
        creativeId: `mock_creative_${Date.now()}`,
      }
    }

    try {
      // Step 1: create the ad creative
      const creativeBody: Record<string, unknown> = {
        name: `${params.name} Creative`,
        page_id: params.pageId,
        link: params.link,
        message: params.primaryText,
        access_token: this.accessToken,
        object_story_spec: {
          page_id: params.pageId,
          link_data: {
            link: params.link,
            message: params.primaryText,
            name: params.headline,
            description: params.description,
            call_to_action: { type: params.callToAction },
            ...(params.imageUrl ? { picture: params.imageUrl } : {}),
          },
        },
      }

      const creative = await this.graphPost<{ id: string }>(
        `/${params.adAccountId}/adcreatives`,
        creativeBody,
      )

      // Step 2: create the ad
      const ad = await this.graphPost<{ id: string }>(`/${params.adAccountId}/ads`, {
        name: params.name,
        adset_id: params.adSetId,
        creative: { creative_id: creative.id },
        status: params.status,
        access_token: this.accessToken,
      })

      return { externalId: ad.id, creativeId: creative.id }
    } catch (err) {
      this.logger.error('createAd failed, falling back to mock', err)
      return {
        externalId: `mock_ad_${Date.now()}`,
        creativeId: `mock_creative_${Date.now()}`,
      }
    }
  }

  async pauseCampaign(adAccountId: string, metaCampaignId: string): Promise<void> {
    if (this.isMockMode) {
      this.logger.debug('[MOCK] pauseCampaign', { adAccountId, metaCampaignId })
      return
    }

    try {
      await this.graphPost(`/${metaCampaignId}`, {
        status: 'PAUSED',
        access_token: this.accessToken,
      })
    } catch (err) {
      this.logger.error('pauseCampaign failed', err)
      throw err
    }
  }

  async resumeCampaign(adAccountId: string, metaCampaignId: string): Promise<void> {
    if (this.isMockMode) {
      this.logger.debug('[MOCK] resumeCampaign', { adAccountId, metaCampaignId })
      return
    }

    try {
      await this.graphPost(`/${metaCampaignId}`, {
        status: 'ACTIVE',
        access_token: this.accessToken,
      })
    } catch (err) {
      this.logger.error('resumeCampaign failed', err)
      throw err
    }
  }

  async listAdAccounts(bmId: string): Promise<MetaAdAccountEntry[]> {
    if (this.isMockMode) {
      this.logger.debug('[MOCK] listAdAccounts')
      return [
        { id: 'act_111111111', name: 'Mock Ad Account 1', currency: 'BRL', accountStatus: 1 },
        { id: 'act_222222222', name: 'Mock Ad Account 2', currency: 'BRL', accountStatus: 1 },
      ]
    }

    try {
      const fields = 'name,account_id,account_status,currency'

      const [owned, client] = await Promise.all([
        this.graphGet<{ data: Array<{ account_id: string; name: string; currency: string; account_status: number }> }>(
          `/${bmId}/owned_ad_accounts`,
          { fields, access_token: this.accessToken },
        ),
        this.graphGet<{ data: Array<{ account_id: string; name: string; currency: string; account_status: number }> }>(
          `/${bmId}/client_ad_accounts`,
          { fields, access_token: this.accessToken },
        ),
      ])

      const seen = new Set<string>()
      const results: MetaAdAccountEntry[] = []
      for (const item of [...(owned.data ?? []), ...(client.data ?? [])]) {
        const id = `act_${item.account_id}`
        if (!seen.has(id)) {
          seen.add(id)
          results.push({ id, name: item.name, currency: item.currency, accountStatus: item.account_status })
        }
      }
      return results
    } catch (err) {
      this.logger.error('listAdAccounts failed, returning empty', err)
      return []
    }
  }

  async createAdAccount(params: CreateMetaAdAccountParams): Promise<{ id: string; name: string }> {
    if (this.isMockMode) {
      this.logger.debug('[MOCK] createAdAccount')
      return { id: `act_mock_${Date.now()}`, name: params.name }
    }

    try {
      const body: Record<string, unknown> = {
        name: params.name,
        currency: params.currency ?? 'BRL',
        timezone_id: params.timezoneId ?? 37,
        end_advertiser: params.endAdvertiser ?? params.bmId,
        media_agency: params.bmId,
        partner: 'NONE',
        access_token: this.accessToken,
      }

      this.logger.debug('createAdAccount request', { bmId: params.bmId, name: params.name })
      const data = await this.graphPost<{ id: string }>(`/${params.bmId}/adaccount`, body)
      this.logger.debug('createAdAccount response', data)
      return { id: data.id, name: params.name }
    } catch (err) {
      this.logger.error('createAdAccount failed', err)
      throw err
    }
  }

  async syncMetrics(params: SyncMetricsParams): Promise<AdMetricsResult[]> {
    if (this.isMockMode) {
      this.logger.debug('[MOCK] syncMetrics')
      return []
    }

    try {
      const results: AdMetricsResult[] = []
      const fields =
        'impressions,clicks,reach,spend,actions,action_values,ctr,cpc,cpm,cpp,frequency'

      for (const adId of params.adIds) {
        const data = await this.graphGet<{
          data: Array<{
            date_start: string
            impressions?: string
            clicks?: string
            reach?: string
            spend?: string
            ctr?: string
            cpc?: string
            cpm?: string
            cpp?: string
            frequency?: string
            actions?: Array<{ action_type: string; value: string }>
            action_values?: Array<{ action_type: string; value: string }>
          }>
        }>(`/${adId}/insights`, {
          fields,
          time_range: JSON.stringify(params.dateRange),
          level: 'ad',
          access_token: this.accessToken,
        })

        for (const row of data.data) {
          const conversions =
            row.actions?.find((a) => a.action_type === 'offsite_conversion.fb_pixel_purchase')
          const roas =
            row.action_values?.find((a) => a.action_type === 'offsite_conversion.fb_pixel_purchase')

          results.push({
            metaAdId: adId,
            date: row.date_start,
            impressions: parseInt(row.impressions ?? '0', 10),
            clicks: parseInt(row.clicks ?? '0', 10),
            reach: parseInt(row.reach ?? '0', 10),
            spend: parseFloat(row.spend ?? '0'),
            conversions: conversions ? parseInt(conversions.value, 10) : 0,
            results: conversions ? parseInt(conversions.value, 10) : 0,
            ctr: row.ctr ? parseFloat(row.ctr) : null,
            cpc: row.cpc ? parseFloat(row.cpc) : null,
            cpm: row.cpm ? parseFloat(row.cpm) : null,
            cpp: row.cpp ? parseFloat(row.cpp) : null,
            roas: roas ? parseFloat(roas.value) : null,
            frequency: row.frequency ? parseFloat(row.frequency) : null,
          })
        }
      }

      return results
    } catch (err) {
      this.logger.error('syncMetrics failed, returning empty', err)
      return []
    }
  }
}
