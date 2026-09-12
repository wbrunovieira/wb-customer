import { Module } from '@nestjs/common'
import {
  SocialController,
  SocialAttributionController,
  SocialAttributionPanelController,
} from '@/infra/controllers/social.controller'
import { ValidateSocialContentUseCase } from '@/domain/social/application/use-cases/validate-social-content.use-case'
import { CreateAttributionLinkUseCase } from '@/domain/social/application/use-cases/create-attribution-link.use-case'
import { GetAttributionPanelUseCase } from '@/domain/social/application/use-cases/get-attribution-panel.use-case'
import { ISocialAttributionLinkRepository } from '@/domain/social/application/repositories/i-social-attribution-link.repository'
import { ISocialAttributionReportRepository } from '@/domain/social/application/repositories/i-social-attribution-report.repository'
import { PrismaSocialAttributionLinkRepository } from '@/infra/database/prisma/repositories/social/prisma-social-attribution-link.repository'
import { PrismaSocialAttributionReportRepository } from '@/infra/database/prisma/repositories/social/prisma-social-attribution-report.repository'

/**
 * Domínio social. O que o Postiz não faz e por isso fica aqui: o validador das
 * regras da casa, a atribuição de origem das conversas e a leitura de resultado.
 * Publicação e agendamento são dele (decisão #1879).
 *
 * ICustomerRepository vem do DatabaseModule, que é @Global.
 */
@Module({
  controllers: [
    SocialController,
    SocialAttributionController,
    SocialAttributionPanelController,
  ],
  providers: [
    ValidateSocialContentUseCase,
    CreateAttributionLinkUseCase,
    GetAttributionPanelUseCase,
    {
      provide: ISocialAttributionLinkRepository,
      useClass: PrismaSocialAttributionLinkRepository,
    },
    {
      provide: ISocialAttributionReportRepository,
      useClass: PrismaSocialAttributionReportRepository,
    },
  ],
  exports: [ValidateSocialContentUseCase, ISocialAttributionLinkRepository],
})
export class SocialModule {}
