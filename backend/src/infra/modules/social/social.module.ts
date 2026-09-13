import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import {
  SocialController,
  SocialAttributionController,
  SocialAttributionPanelController,
  SocialGroupsController,
  CustomerSocialGroupController,
  SocialPublicationsController,
  SocialQueueController,
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
import { GetSocialQueueUseCase } from '@/domain/social/application/use-cases/get-social-queue.use-case'
import { CancelSocialPostUseCase } from '@/domain/social/application/use-cases/cancel-social-post.use-case'
import { ISocialPublicationRepository } from '@/domain/social/application/repositories/i-social-publication.repository'
import { PrismaSocialPublicationRepository } from '@/infra/database/prisma/repositories/social/prisma-social-publication.repository'
import { PostizSocialEngineAdapter } from '@/infra/adapters/social-engine/postiz-social-engine.adapter'

/**
 * Domínio social. O que o Postiz não faz e por isso fica aqui: o validador das
 * regras da casa, a atribuição de origem das conversas e a leitura de resultado.
 * Publicação e agendamento são dele (decisão #1879).
 *
 * ICustomerRepository vem do DatabaseModule, que é @Global.
 */
@Module({
  imports: [ConfigModule],
  controllers: [
    SocialController,
    SocialAttributionController,
    SocialAttributionPanelController,
    SocialGroupsController,
    CustomerSocialGroupController,
    SocialPublicationsController,
    SocialQueueController,
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
    GetSocialQueueUseCase,
    CancelSocialPostUseCase,
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
