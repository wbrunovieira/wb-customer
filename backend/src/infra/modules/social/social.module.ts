import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
// Traz ICreativeRepository: publicar com a arte do criativo precisa lê-lo.
// Sem ciclo — CreativesModule não conhece o social.
import { CreativesModule } from '@/infra/modules/creatives/creatives.module'
import {
  SocialController,
  SocialAttributionController,
  SocialAttributionPanelController,
  SocialGroupsController,
  CustomerSocialGroupController,
  SocialPublicationsController,
  SocialQueueController,
  SocialFeedController,
  SocialPostMetricsController,
  SocialStoredMetricsController,
} from '@/infra/controllers/social.controller'
import { ValidateSocialContentUseCase } from '@/domain/social/application/use-cases/validate-social-content.use-case'
import { CreateAttributionLinkUseCase } from '@/domain/social/application/use-cases/create-attribution-link.use-case'
import { GetAttributionPanelUseCase } from '@/domain/social/application/use-cases/get-attribution-panel.use-case'
import { ISocialAttributionLinkRepository } from '@/domain/social/application/repositories/i-social-attribution-link.repository'
import { ISocialAttributionReportRepository } from '@/domain/social/application/repositories/i-social-attribution-report.repository'
import { PrismaSocialAttributionLinkRepository } from '@/infra/database/prisma/repositories/social/prisma-social-attribution-link.repository'
import { PrismaSocialAttributionReportRepository } from '@/infra/database/prisma/repositories/social/prisma-social-attribution-report.repository'
import { ListSocialGroupsUseCase } from '@/domain/social/application/use-cases/list-social-groups.use-case'
import { LinkCustomerSocialGroupUseCase } from '@/domain/social/application/use-cases/link-customer-social-group.use-case'
import { GetCustomerSocialChannelsUseCase } from '@/domain/social/application/use-cases/get-customer-social-channels.use-case'
import { ISocialEngineGateway } from '@/domain/social/application/gateways/i-social-engine.gateway'
import { PublishSocialPostUseCase } from '@/domain/social/application/use-cases/publish-social-post.use-case'
import { ListSocialPublicationsUseCase } from '@/domain/social/application/use-cases/list-social-publications.use-case'
import { PublishSocialPostsBatchUseCase } from '@/domain/social/application/use-cases/publish-social-posts-batch.use-case'
import { GetSocialQueueUseCase } from '@/domain/social/application/use-cases/get-social-queue.use-case'
import { CancelSocialPostUseCase } from '@/domain/social/application/use-cases/cancel-social-post.use-case'
import { GetSocialFeedUseCase } from '@/domain/social/application/use-cases/get-social-feed.use-case'
import { GetPostMetricsUseCase } from '@/domain/social/application/use-cases/get-post-metrics.use-case'
import { ReconcileSocialPublicationsUseCase } from '@/domain/social/application/use-cases/reconcile-social-publications.use-case'
import { SyncSocialMetricsUseCase } from '@/domain/social/application/use-cases/sync-social-metrics.use-case'
import { ListSocialPostMetricsUseCase } from '@/domain/social/application/use-cases/list-social-post-metrics.use-case'
import { ISocialPostMetricRepository } from '@/domain/social/application/repositories/i-social-post-metric.repository'
import { PrismaSocialPostMetricRepository } from '@/infra/database/prisma/repositories/social/prisma-social-post-metric.repository'
import { SocialMetricsSchedulerService } from '@/infra/scheduled/social-metrics-scheduler.service'
import { SocialReconciliationSchedulerService } from '@/infra/scheduled/social-reconciliation-scheduler.service'
import { ISocialPublicationRepository } from '@/domain/social/application/repositories/i-social-publication.repository'
import { PrismaSocialPublicationRepository } from '@/infra/database/prisma/repositories/social/prisma-social-publication.repository'
import { PostizSocialEngineAdapter } from '@/infra/adapters/social-engine/postiz-social-engine.adapter'
import { SocialEngineConfigController } from '@/infra/controllers/social-engine-config.controller'
import { SaveSocialEngineConfigUseCase } from '@/domain/social/application/use-cases/save-social-engine-config.use-case'
import { GetSocialEngineConfigStatusUseCase } from '@/domain/social/application/use-cases/get-social-engine-config-status.use-case'
import { TestSocialEngineConfigUseCase } from '@/domain/social/application/use-cases/test-social-engine-config.use-case'
import { ISocialEngineConfigRepository } from '@/domain/social/application/repositories/i-social-engine-config.repository'
import { PrismaSocialEngineConfigRepository } from '@/infra/database/prisma/repositories/social/prisma-social-engine-config.repository'

/**
 * Domínio social. O que o Postiz não faz e por isso fica aqui: o validador das
 * regras da casa, a atribuição de origem das conversas e a leitura de resultado.
 * Publicação e agendamento são dele (decisão #1879).
 *
 * ICustomerRepository vem do DatabaseModule, que é @Global.
 */
@Module({
  imports: [ConfigModule, CreativesModule],
  controllers: [
    SocialController,
    SocialAttributionController,
    SocialAttributionPanelController,
    SocialGroupsController,
    CustomerSocialGroupController,
    SocialPublicationsController,
    SocialQueueController,
    SocialFeedController,
    SocialPostMetricsController,
    SocialStoredMetricsController,
    SocialEngineConfigController,
  ],
  providers: [
    ValidateSocialContentUseCase,
    CreateAttributionLinkUseCase,
    GetAttributionPanelUseCase,
    ListSocialGroupsUseCase,
    LinkCustomerSocialGroupUseCase,
    GetCustomerSocialChannelsUseCase,
    PublishSocialPostUseCase,
    ListSocialPublicationsUseCase,
    PublishSocialPostsBatchUseCase,
    GetSocialQueueUseCase,
    CancelSocialPostUseCase,
    GetSocialFeedUseCase,
    GetPostMetricsUseCase,
    ReconcileSocialPublicationsUseCase,
    SocialReconciliationSchedulerService,
    SyncSocialMetricsUseCase,
    ListSocialPostMetricsUseCase,
    SocialMetricsSchedulerService,
    SaveSocialEngineConfigUseCase,
    GetSocialEngineConfigStatusUseCase,
    TestSocialEngineConfigUseCase,
    {
      provide: ISocialEngineConfigRepository,
      useClass: PrismaSocialEngineConfigRepository,
    },
    {
      provide: ISocialPostMetricRepository,
      useClass: PrismaSocialPostMetricRepository,
    },
    {
      provide: ISocialPublicationRepository,
      useClass: PrismaSocialPublicationRepository,
    },
    {
      provide: ISocialEngineGateway,
      useClass: PostizSocialEngineAdapter,
    },
    {
      provide: ISocialAttributionLinkRepository,
      useClass: PrismaSocialAttributionLinkRepository,
    },
    {
      provide: ISocialAttributionReportRepository,
      useClass: PrismaSocialAttributionReportRepository,
    },
  ],
  exports: [
    ValidateSocialContentUseCase,
    ISocialAttributionLinkRepository,
    ISocialEngineGateway,
  ],
})
export class SocialModule {}
