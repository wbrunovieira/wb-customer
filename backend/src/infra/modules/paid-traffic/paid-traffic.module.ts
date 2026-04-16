import { Module } from '@nestjs/common'
import { MetaConfigController } from '@/infra/controllers/meta-config.controller'
import { MetaAdAccountController, CampaignsController } from '@/infra/controllers/paid-traffic.controller'

// Use-cases
import { SaveMetaConfigUseCase } from '@/domain/paid-traffic/application/use-cases/save-meta-config.use-case'
import { GetMetaConfigUseCase } from '@/domain/paid-traffic/application/use-cases/get-meta-config.use-case'
import { SaveMetaAdAccountUseCase } from '@/domain/paid-traffic/application/use-cases/save-meta-ad-account.use-case'
import { GetMetaAdAccountUseCase } from '@/domain/paid-traffic/application/use-cases/get-meta-ad-account.use-case'
import { CreateCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/create-campaign.use-case'
import { UpdateCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/update-campaign.use-case'
import { ListCustomerCampaignsUseCase } from '@/domain/paid-traffic/application/use-cases/list-customer-campaigns.use-case'
import { GetCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/get-campaign.use-case'
import { MarkCampaignReadyUseCase } from '@/domain/paid-traffic/application/use-cases/mark-campaign-ready.use-case'
import { ArchiveCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/archive-campaign.use-case'
import { DeleteCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/delete-campaign.use-case'
import { CreateAdSetUseCase } from '@/domain/paid-traffic/application/use-cases/create-ad-set.use-case'
import { UpdateAdSetUseCase } from '@/domain/paid-traffic/application/use-cases/update-ad-set.use-case'
import { DeleteAdSetUseCase } from '@/domain/paid-traffic/application/use-cases/delete-ad-set.use-case'
import { CreateAdUseCase } from '@/domain/paid-traffic/application/use-cases/create-ad.use-case'
import { UpdateAdUseCase } from '@/domain/paid-traffic/application/use-cases/update-ad.use-case'
import { DeleteAdUseCase } from '@/domain/paid-traffic/application/use-cases/delete-ad.use-case'
import { RecordAdDailyMetricsUseCase } from '@/domain/paid-traffic/application/use-cases/record-ad-daily-metrics.use-case'
import { GetCampaignDashboardUseCase } from '@/domain/paid-traffic/application/use-cases/get-campaign-dashboard.use-case'
import { PublishCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/publish-campaign.use-case'
import { SyncCampaignMetricsUseCase } from '@/domain/paid-traffic/application/use-cases/sync-campaign-metrics.use-case'
import { PauseCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/pause-campaign.use-case'
import { ResumeCampaignUseCase } from '@/domain/paid-traffic/application/use-cases/resume-campaign.use-case'
import { ListMetaAdAccountsUseCase } from '@/domain/paid-traffic/application/use-cases/list-meta-ad-accounts.use-case'

// Repository interfaces
import { IMetaConfigRepository } from '@/domain/paid-traffic/application/repositories/i-meta-config.repository'
import { IMetaAdAccountRepository } from '@/domain/paid-traffic/application/repositories/i-meta-ad-account.repository'
import { ICampaignRepository } from '@/domain/paid-traffic/application/repositories/i-campaign.repository'
import { IAdSetRepository } from '@/domain/paid-traffic/application/repositories/i-ad-set.repository'
import { IAdRepository } from '@/domain/paid-traffic/application/repositories/i-ad.repository'
import { IAdDailyMetricRepository } from '@/domain/paid-traffic/application/repositories/i-ad-daily-metric.repository'

// Adapter interface and implementation
import { IAdPlatformAdapter } from '@/domain/paid-traffic/application/services/i-ad-platform.adapter'
import { MetaAdPlatformAdapter } from '@/infra/adapters/ad-platform/meta-ad-platform.adapter'

// Prisma repositories
import { PrismaMetaConfigRepository } from '@/infra/database/prisma/repositories/paid-traffic/prisma-meta-config.repository'
import { PrismaMetaAdAccountRepository } from '@/infra/database/prisma/repositories/paid-traffic/prisma-meta-ad-account.repository'
import { PrismaCampaignRepository } from '@/infra/database/prisma/repositories/paid-traffic/prisma-campaign.repository'
import { PrismaAdSetRepository } from '@/infra/database/prisma/repositories/paid-traffic/prisma-ad-set.repository'
import { PrismaAdRepository } from '@/infra/database/prisma/repositories/paid-traffic/prisma-ad.repository'
import { PrismaAdDailyMetricRepository } from '@/infra/database/prisma/repositories/paid-traffic/prisma-ad-daily-metric.repository'

// Schedulers
import { MetricsSyncSchedulerService } from '@/infra/scheduled/metrics-sync-scheduler.service'

@Module({
  controllers: [MetaConfigController, MetaAdAccountController, CampaignsController],
  providers: [
    // Use-cases
    SaveMetaConfigUseCase,
    GetMetaConfigUseCase,
    SaveMetaAdAccountUseCase,
    GetMetaAdAccountUseCase,
    CreateCampaignUseCase,
    UpdateCampaignUseCase,
    ListCustomerCampaignsUseCase,
    GetCampaignUseCase,
    MarkCampaignReadyUseCase,
    ArchiveCampaignUseCase,
    DeleteCampaignUseCase,
    CreateAdSetUseCase,
    UpdateAdSetUseCase,
    DeleteAdSetUseCase,
    CreateAdUseCase,
    UpdateAdUseCase,
    DeleteAdUseCase,
    RecordAdDailyMetricsUseCase,
    GetCampaignDashboardUseCase,
    PublishCampaignUseCase,
    SyncCampaignMetricsUseCase,
    PauseCampaignUseCase,
    ResumeCampaignUseCase,
    ListMetaAdAccountsUseCase,

    // Schedulers
    MetricsSyncSchedulerService,

    // Adapter binding
    { provide: IAdPlatformAdapter, useClass: MetaAdPlatformAdapter },

    // Repository bindings
    { provide: IMetaConfigRepository, useClass: PrismaMetaConfigRepository },
    { provide: IMetaAdAccountRepository, useClass: PrismaMetaAdAccountRepository },
    { provide: ICampaignRepository, useClass: PrismaCampaignRepository },
    { provide: IAdSetRepository, useClass: PrismaAdSetRepository },
    { provide: IAdRepository, useClass: PrismaAdRepository },
    { provide: IAdDailyMetricRepository, useClass: PrismaAdDailyMetricRepository },
  ],
})
export class PaidTrafficModule {}
