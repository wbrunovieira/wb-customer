import { Module } from '@nestjs/common'
import {
  SocialController,
  SocialAttributionController,
} from '@/infra/controllers/social.controller'
import { ValidateSocialContentUseCase } from '@/domain/social/application/use-cases/validate-social-content.use-case'
import { CreateAttributionLinkUseCase } from '@/domain/social/application/use-cases/create-attribution-link.use-case'
import { ISocialAttributionLinkRepository } from '@/domain/social/application/repositories/i-social-attribution-link.repository'
import { PrismaSocialAttributionLinkRepository } from '@/infra/database/prisma/repositories/social/prisma-social-attribution-link.repository'

/**
 * Domínio social. Duas coisas que o Postiz não faz e por isso ficam aqui:
 * o validador das regras da casa e a atribuição de origem das conversas.
 * Publicação e agendamento são dele (decisão #1879).
 *
 * ICustomerRepository vem do DatabaseModule, que é @Global.
 */
@Module({
  controllers: [SocialController, SocialAttributionController],
  providers: [
    ValidateSocialContentUseCase,
    CreateAttributionLinkUseCase,
    {
      provide: ISocialAttributionLinkRepository,
      useClass: PrismaSocialAttributionLinkRepository,
    },
  ],
  exports: [ValidateSocialContentUseCase, ISocialAttributionLinkRepository],
})
export class SocialModule {}
