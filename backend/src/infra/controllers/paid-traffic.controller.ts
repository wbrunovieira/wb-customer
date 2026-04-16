import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/infra/auth/guards/jwt-auth.guard'
import { RolesGuard } from '@/infra/auth/guards/roles.guard'
import { Roles } from '@/infra/auth/decorators/roles.decorator'
import { CurrentUser } from '@/infra/auth/decorators/current-user.decorator'

import { SaveMetaAdAccountUseCase } from '@/domain/paid-traffic/application/use-cases/save-meta-ad-account.use-case'
import { GetMetaAdAccountUseCase } from '@/domain/paid-traffic/application/use-cases/get-meta-ad-account.use-case'
import { CreateCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/create-campaign.use-case'
import { UpdateCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/update-campaign.use-case'
import { ListCustomerCampaignsUseCase } from '@/domain/paid-traffic/application/use-cases/list-customer-campaigns.use-case'
import { GetCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/get-campaign.use-case'
import { MarkCampaignReadyUseCase } from '@/domain/paid-traffic/application/use-cases/mark-campaign-ready.use-case'
import { DeleteCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/delete-campaign.use-case'
import { CreateAdSetUseCase } from '@/domain/paid-traffic/application/use-cases/create-ad-set.use-case'
import { UpdateAdSetUseCase } from '@/domain/paid-traffic/application/use-cases/update-ad-set.use-case'
import { DeleteAdSetUseCase } from '@/domain/paid-traffic/application/use-cases/delete-ad-set.use-case'
import { CreateAdUseCase } from '@/domain/paid-traffic/application/use-cases/create-ad.use-case'
import { UpdateAdUseCase } from '@/domain/paid-traffic/application/use-cases/update-ad.use-case'
import { DeleteAdUseCase } from '@/domain/paid-traffic/application/use-cases/delete-ad.use-case'
import { RecordAdDailyMetricsUseCase } from '@/domain/paid-traffic/application/use-cases/record-ad-daily-metrics.use-case'
import { GetCampaignDashboardUseCase } from '@/domain/paid-traffic/application/use-cases/get-campaign-dashboard.use-case'

import { Campaign } from '@/domain/paid-traffic/enterprise/entities/campaign'
import { AdSet } from '@/domain/paid-traffic/enterprise/entities/ad-set'
import { Ad } from '@/domain/paid-traffic/enterprise/entities/ad'
import { MetaAdAccount } from '@/domain/paid-traffic/enterprise/entities/meta-ad-account'

// ── DTOs ─────────────────────────────────────────────────────────────────────

class SaveMetaAdAccountDto {
  @ApiProperty({ example: 'act_123456789' }) adAccountId!: string
  @ApiPropertyOptional({ example: '123456' }) pageId?: string
  @ApiPropertyOptional({ example: '987654' }) pixelId?: string
  @ApiPropertyOptional({ example: '555555' }) instagramActorId?: string
  @ApiPropertyOptional({ example: 'My Ad Account' }) accountName?: string
}

class CreateCampaignDto {
  @ApiProperty({ example: 'Black Friday Campaign' }) name!: string
  @ApiProperty({ enum: ['CONVERSIONS', 'LINK_CLICKS', 'REACH', 'BRAND_AWARENESS', 'LEAD_GENERATION', 'VIDEO_VIEWS', 'POST_ENGAGEMENT'] }) objective!: string
  @ApiPropertyOptional({ example: 5000 }) plannedBudget?: number
  @ApiPropertyOptional({ example: 200 }) dailyBudget?: number
  @ApiPropertyOptional({ example: '2026-05-01T00:00:00Z' }) startAt?: string
  @ApiPropertyOptional({ example: '2026-05-31T00:00:00Z' }) endAt?: string
  @ApiPropertyOptional() notes?: string
}

class UpdateCampaignDto {
  @ApiPropertyOptional({ example: 'Updated Name' }) name?: string
  @ApiPropertyOptional({ enum: ['CONVERSIONS', 'LINK_CLICKS', 'REACH', 'BRAND_AWARENESS', 'LEAD_GENERATION', 'VIDEO_VIEWS', 'POST_ENGAGEMENT'] }) objective?: string
  @ApiPropertyOptional() plannedBudget?: number | null
  @ApiPropertyOptional() dailyBudget?: number | null
  @ApiPropertyOptional() startAt?: string | null
  @ApiPropertyOptional() endAt?: string | null
  @ApiPropertyOptional() notes?: string | null
}

class CreateAdSetDto {
  @ApiProperty({ example: 'Lookalike 1%' }) name!: string
  @ApiPropertyOptional({ example: 100 }) dailyBudget?: number
  @ApiPropertyOptional({ example: 3000 }) totalBudget?: number
  @ApiPropertyOptional() startAt?: string
  @ApiPropertyOptional() endAt?: string
  @ApiPropertyOptional({ description: 'Targeting spec JSON' }) targeting?: unknown
  @ApiPropertyOptional({ example: 'OFFSITE_CONVERSIONS' }) optimizationGoal?: string
  @ApiPropertyOptional({ example: 'IMPRESSIONS' }) billingEvent?: string
}

class UpdateAdSetDto {
  @ApiPropertyOptional() name?: string
  @ApiPropertyOptional({ enum: ['active', 'paused', 'archived'] }) status?: string
  @ApiPropertyOptional() dailyBudget?: number | null
  @ApiPropertyOptional() totalBudget?: number | null
  @ApiPropertyOptional() targeting?: unknown | null
  @ApiPropertyOptional() optimizationGoal?: string | null
  @ApiPropertyOptional() billingEvent?: string | null
}

class CreateAdDto {
  @ApiProperty({ example: 'Summer Sale Ad' }) name!: string
  @ApiPropertyOptional({ description: 'Creative ID from creatives module' }) creativeId?: string
  @ApiPropertyOptional({ example: 'Shop our biggest sale of the year!' }) primaryText?: string
  @ApiPropertyOptional({ example: 'Up to 50% off' }) headline?: string
  @ApiPropertyOptional({ example: 'Limited time offer' }) description?: string
  @ApiPropertyOptional({ enum: ['LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'CONTACT_US', 'BOOK_NOW', 'DOWNLOAD', 'GET_QUOTE', 'SUBSCRIBE', 'WATCH_MORE', 'NO_BUTTON'], default: 'LEARN_MORE' }) callToAction?: string
  @ApiPropertyOptional({ example: 'https://mysite.com/sale' }) destinationUrl?: string
}

class UpdateAdDto {
  @ApiPropertyOptional() name?: string
  @ApiPropertyOptional({ enum: ['active', 'paused', 'archived'] }) status?: string
  @ApiPropertyOptional() creativeId?: string | null
  @ApiPropertyOptional() primaryText?: string | null
  @ApiPropertyOptional() headline?: string | null
  @ApiPropertyOptional() description?: string | null
  @ApiPropertyOptional({ enum: ['LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'CONTACT_US', 'BOOK_NOW', 'DOWNLOAD', 'GET_QUOTE', 'SUBSCRIBE', 'WATCH_MORE', 'NO_BUTTON'] }) callToAction?: string
  @ApiPropertyOptional() destinationUrl?: string | null
}

class RecordMetricsDto {
  @ApiProperty({ description: 'Ad ID' }) adId!: string
  @ApiProperty({ example: '2026-04-01' }) date!: string
  @ApiProperty({ example: 10000 }) impressions!: number
  @ApiProperty({ example: 320 }) clicks!: number
  @ApiProperty({ example: 9000 }) reach!: number
  @ApiProperty({ example: 50.0, description: 'Amount spent in campaign currency' }) spent!: number
  @ApiProperty({ example: 15 }) conversions!: number
  @ApiProperty({ example: 15 }) results!: number
  @ApiPropertyOptional({ example: 3.2 }) ctr?: number
  @ApiPropertyOptional({ example: 0.16 }) cpc?: number
  @ApiPropertyOptional({ example: 5.0 }) cpm?: number
  @ApiPropertyOptional({ example: 5.5 }) cpp?: number
  @ApiPropertyOptional({ example: 4.2 }) roas?: number
  @ApiPropertyOptional({ example: 1.1 }) frequency?: number
}

// ── Serializers ───────────────────────────────────────────────────────────────

function campaignToHttp(c: Campaign) {
  return {
    id: c.id.value,
    customerId: c.customerId,
    name: c.name,
    objective: c.objective,
    status: c.status,
    publishStatus: c.publishStatus,
    plannedBudget: c.plannedBudget,
    dailyBudget: c.dailyBudget,
    startAt: c.startAt,
    endAt: c.endAt,
    notes: c.notes,
    metaCampaignId: c.metaCampaignId,
    publishError: c.publishError,
    createdByUserId: c.createdByUserId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

function adSetToHttp(a: AdSet) {
  return {
    id: a.id.value,
    campaignId: a.campaignId,
    name: a.name,
    status: a.status,
    publishStatus: a.publishStatus,
    dailyBudget: a.dailyBudget,
    totalBudget: a.totalBudget,
    startAt: a.startAt,
    endAt: a.endAt,
    targeting: a.targeting,
    optimizationGoal: a.optimizationGoal,
    billingEvent: a.billingEvent,
    metaAdSetId: a.metaAdSetId,
    publishError: a.publishError,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

function adToHttp(a: Ad) {
  return {
    id: a.id.value,
    adSetId: a.adSetId,
    creativeId: a.creativeId,
    name: a.name,
    status: a.status,
    publishStatus: a.publishStatus,
    primaryText: a.primaryText,
    headline: a.headline,
    description: a.description,
    callToAction: a.callToAction,
    destinationUrl: a.destinationUrl,
    metaAdId: a.metaAdId,
    publishError: a.publishError,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

function metaAccountToHttp(a: MetaAdAccount) {
  return {
    id: a.id.value,
    customerId: a.customerId,
    adAccountId: a.adAccountId,
    pageId: a.pageId,
    pixelId: a.pixelId,
    instagramActorId: a.instagramActorId,
    accountName: a.accountName,
    isActive: a.isActive,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

// ── Meta Ad Account Controller ────────────────────────────────────────────────

@ApiTags('Paid Traffic — Meta Ad Account')
@ApiBearerAuth()
@Controller('customers/:customerId/meta-account')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class MetaAdAccountController {
  constructor(
    private readonly saveMetaAdAccount: SaveMetaAdAccountUseCase,
    private readonly getMetaAdAccount: GetMetaAdAccountUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create or update Meta ad account for customer' })
  @ApiParam({ name: 'customerId' })
  @ApiBody({ type: SaveMetaAdAccountDto })
  @ApiResponse({ status: 201, description: 'Meta ad account saved' })
  async save(
    @Param('customerId') customerId: string,
    @Body() body: SaveMetaAdAccountDto,
  ) {
    await this.saveMetaAdAccount.execute({
      customerId,
      adAccountId: body.adAccountId,
      pageId: body.pageId,
      pixelId: body.pixelId,
      instagramActorId: body.instagramActorId,
      accountName: body.accountName,
    })
    return { success: true }
  }

  @Get()
  @ApiOperation({ summary: 'Get Meta ad account for customer' })
  @ApiParam({ name: 'customerId' })
  @ApiResponse({ status: 200, description: 'Meta ad account details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async get(@Param('customerId') customerId: string) {
    const result = await this.getMetaAdAccount.execute({ customerId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return metaAccountToHttp(result.value.account)
  }

  @Patch()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update Meta ad account for customer' })
  @ApiParam({ name: 'customerId' })
  @ApiBody({ type: SaveMetaAdAccountDto })
  @ApiResponse({ status: 204, description: 'Updated' })
  async update(
    @Param('customerId') customerId: string,
    @Body() body: Partial<SaveMetaAdAccountDto>,
  ) {
    const existing = await this.getMetaAdAccount.execute({ customerId })
    if (existing.isLeft()) throw new NotFoundException(existing.value.message)

    await this.saveMetaAdAccount.execute({
      customerId,
      adAccountId: body.adAccountId ?? existing.value.account.adAccountId,
      pageId: body.pageId ?? existing.value.account.pageId,
      pixelId: body.pixelId ?? existing.value.account.pixelId,
      instagramActorId: body.instagramActorId ?? existing.value.account.instagramActorId,
      accountName: body.accountName ?? existing.value.account.accountName,
    })
  }
}

// ── Campaigns Controller ──────────────────────────────────────────────────────

@ApiTags('Paid Traffic — Campaigns')
@ApiBearerAuth()
@Controller('customers/:customerId/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'employee')
export class CampaignsController {
  constructor(
    private readonly createCampaign: CreateCampaignUseCase,
    private readonly updateCampaign: UpdateCampaignUseCase,
    private readonly listCampaigns: ListCustomerCampaignsUseCase,
    private readonly getCampaign: GetCampaignUseCase,
    private readonly markReady: MarkCampaignReadyUseCase,
    private readonly deleteCampaign: DeleteCampaignUseCase,
    private readonly createAdSet: CreateAdSetUseCase,
    private readonly updateAdSet: UpdateAdSetUseCase,
    private readonly deleteAdSet: DeleteAdSetUseCase,
    private readonly createAd: CreateAdUseCase,
    private readonly updateAd: UpdateAdUseCase,
    private readonly deleteAd: DeleteAdUseCase,
    private readonly recordMetrics: RecordAdDailyMetricsUseCase,
    private readonly getDashboard: GetCampaignDashboardUseCase,
  ) {}

  // ── Campaigns ───────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a campaign for a customer' })
  @ApiParam({ name: 'customerId' })
  @ApiBody({ type: CreateCampaignDto })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  @ApiResponse({ status: 400, description: 'Invalid objective' })
  async create(
    @Param('customerId') customerId: string,
    @Body() body: CreateCampaignDto,
    @CurrentUser() user: { userId: string },
  ) {
    const result = await this.createCampaign.execute({
      customerId,
      name: body.name,
      objective: body.objective,
      plannedBudget: body.plannedBudget ?? null,
      dailyBudget: body.dailyBudget ?? null,
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
      notes: body.notes ?? null,
      createdByUserId: user.userId,
    })

    if (result.isLeft()) throw new BadRequestException(result.value.message)
    return { campaignId: result.value.campaignId }
  }

  @Get()
  @ApiOperation({ summary: 'List campaigns for a customer' })
  @ApiParam({ name: 'customerId' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'paused', 'archived'] })
  @ApiQuery({ name: 'publishStatus', required: false, enum: ['draft', 'ready_to_publish', 'publishing', 'published', 'publish_failed'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated campaigns' })
  async list(
    @Param('customerId') customerId: string,
    @Query('status') status?: string,
    @Query('publishStatus') publishStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.listCampaigns.execute({
      customerId,
      status: status as never,
      publishStatus: publishStatus as never,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    if (result.isLeft()) throw new BadRequestException()
    return { items: result.value.items.map(campaignToHttp), total: result.value.total }
  }

  @Get(':campaignId')
  @ApiOperation({ summary: 'Get campaign with nested ad sets and ads' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiResponse({ status: 200, description: 'Campaign details with ad sets and ads' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async get(
    @Param('customerId') _customerId: string,
    @Param('campaignId') campaignId: string,
  ) {
    const result = await this.getCampaign.execute({ campaignId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)

    return {
      ...campaignToHttp(result.value.campaign),
      adSets: result.value.adSets.map(({ adSet, ads }) => ({
        ...adSetToHttp(adSet),
        ads: ads.map(adToHttp),
      })),
    }
  }

  @Patch(':campaignId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update campaign metadata' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiBody({ type: UpdateCampaignDto })
  @ApiResponse({ status: 204, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async update(
    @Param('campaignId') campaignId: string,
    @Body() body: UpdateCampaignDto,
  ) {
    const result = await this.updateCampaign.execute({
      campaignId,
      name: body.name,
      objective: body.objective,
      plannedBudget: body.plannedBudget,
      dailyBudget: body.dailyBudget,
      startAt: body.startAt !== undefined ? (body.startAt ? new Date(body.startAt) : null) : undefined,
      endAt: body.endAt !== undefined ? (body.endAt ? new Date(body.endAt) : null) : undefined,
      notes: body.notes,
    })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  @Post(':campaignId/mark-ready')
  @ApiOperation({ summary: 'Mark campaign as ready to publish' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiResponse({ status: 200, description: 'Campaign marked as ready' })
  @ApiResponse({ status: 400, description: 'Campaign not in draft status' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async markCampaignReady(
    @Param('campaignId') campaignId: string,
  ) {
    const result = await this.markReady.execute({ campaignId })
    if (result.isLeft()) {
      const msg = result.value.message
      if (msg.includes('not found')) throw new NotFoundException(msg)
      throw new BadRequestException(msg)
    }
    return { success: true }
  }

  @Delete(':campaignId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a campaign (and its ad sets/ads via cascade)' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async deleteCampaignRoute(
    @Param('campaignId') campaignId: string,
  ) {
    const result = await this.deleteCampaign.execute({ campaignId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  // ── Ad Sets ─────────────────────────────────────────────────────────────────

  @Post(':campaignId/ad-sets')
  @ApiOperation({ summary: 'Create an ad set within a campaign' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiBody({ type: CreateAdSetDto })
  @ApiResponse({ status: 201, description: 'Ad set created' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async createAdSetRoute(
    @Param('campaignId') campaignId: string,
    @Body() body: CreateAdSetDto,
  ) {
    const result = await this.createAdSet.execute({
      campaignId,
      name: body.name,
      dailyBudget: body.dailyBudget ?? null,
      totalBudget: body.totalBudget ?? null,
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
      targeting: body.targeting ?? null,
      optimizationGoal: body.optimizationGoal ?? null,
      billingEvent: body.billingEvent ?? null,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { adSetId: result.value.adSetId }
  }

  @Patch(':campaignId/ad-sets/:adSetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update an ad set' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiParam({ name: 'adSetId' })
  @ApiBody({ type: UpdateAdSetDto })
  @ApiResponse({ status: 204, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Ad set not found' })
  async updateAdSetRoute(
    @Param('adSetId') adSetId: string,
    @Body() body: UpdateAdSetDto,
  ) {
    const result = await this.updateAdSet.execute({
      adSetId,
      name: body.name,
      status: body.status as never,
      dailyBudget: body.dailyBudget,
      totalBudget: body.totalBudget,
      targeting: body.targeting,
      optimizationGoal: body.optimizationGoal,
      billingEvent: body.billingEvent,
    })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  @Delete(':campaignId/ad-sets/:adSetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an ad set' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiParam({ name: 'adSetId' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Ad set not found' })
  async deleteAdSetRoute(@Param('adSetId') adSetId: string) {
    const result = await this.deleteAdSet.execute({ adSetId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  // ── Ads ─────────────────────────────────────────────────────────────────────

  @Post(':campaignId/ad-sets/:adSetId/ads')
  @ApiOperation({ summary: 'Create an ad within an ad set' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiParam({ name: 'adSetId' })
  @ApiBody({ type: CreateAdDto })
  @ApiResponse({ status: 201, description: 'Ad created' })
  @ApiResponse({ status: 404, description: 'Ad set not found' })
  async createAdRoute(
    @Param('adSetId') adSetId: string,
    @Body() body: CreateAdDto,
  ) {
    const result = await this.createAd.execute({
      adSetId,
      name: body.name,
      creativeId: body.creativeId ?? null,
      primaryText: body.primaryText ?? null,
      headline: body.headline ?? null,
      description: body.description ?? null,
      callToAction: (body.callToAction as never) ?? 'LEARN_MORE',
      destinationUrl: body.destinationUrl ?? null,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)
    return { adId: result.value.adId }
  }

  @Patch(':campaignId/ad-sets/:adSetId/ads/:adId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update an ad' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiParam({ name: 'adSetId' })
  @ApiParam({ name: 'adId' })
  @ApiBody({ type: UpdateAdDto })
  @ApiResponse({ status: 204, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Ad not found' })
  async updateAdRoute(
    @Param('adId') adId: string,
    @Body() body: UpdateAdDto,
  ) {
    const result = await this.updateAd.execute({
      adId,
      name: body.name,
      status: body.status as never,
      creativeId: body.creativeId,
      primaryText: body.primaryText,
      headline: body.headline,
      description: body.description,
      callToAction: body.callToAction as never,
      destinationUrl: body.destinationUrl,
    })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  @Delete(':campaignId/ad-sets/:adSetId/ads/:adId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an ad' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiParam({ name: 'adSetId' })
  @ApiParam({ name: 'adId' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Ad not found' })
  async deleteAdRoute(@Param('adId') adId: string) {
    const result = await this.deleteAd.execute({ adId })
    if (result.isLeft()) throw new NotFoundException(result.value.message)
  }

  // ── Metrics & Dashboard ─────────────────────────────────────────────────────

  @Post(':campaignId/metrics')
  @ApiOperation({ summary: 'Record daily metrics for an ad' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiBody({ type: RecordMetricsDto })
  @ApiResponse({ status: 201, description: 'Metrics recorded' })
  async recordMetricsRoute(
    @Param('campaignId') campaignId: string,
    @Body() body: RecordMetricsDto,
  ) {
    const result = await this.recordMetrics.execute({
      adId: body.adId,
      campaignId,
      date: new Date(body.date),
      impressions: body.impressions,
      clicks: body.clicks,
      reach: body.reach,
      spent: body.spent,
      conversions: body.conversions,
      results: body.results,
      ctr: body.ctr ?? null,
      cpc: body.cpc ?? null,
      cpm: body.cpm ?? null,
      cpp: body.cpp ?? null,
      roas: body.roas ?? null,
      frequency: body.frequency ?? null,
    })

    if (result.isLeft()) throw new BadRequestException(result.value.message)
    return { success: true }
  }

  @Get(':campaignId/dashboard')
  @ApiOperation({ summary: 'Get campaign analytics dashboard' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'campaignId' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days to look back (default 30)' })
  @ApiResponse({ status: 200, description: 'Dashboard data with totals, daily series, and ad set breakdown' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async dashboardRoute(
    @Param('campaignId') campaignId: string,
    @Query('days') days?: string,
  ) {
    const result = await this.getDashboard.execute({
      campaignId,
      days: days ? parseInt(days, 10) : undefined,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    return {
      campaign: campaignToHttp(result.value.campaign),
      totals: result.value.totals,
      dailySeries: result.value.dailySeries,
      adSetBreakdown: result.value.adSetBreakdown,
    }
  }
}
