import { Module } from '@nestjs/common'
import { SocialController } from '@/infra/controllers/social.controller'
import { ValidateSocialContentUseCase } from '@/domain/social/application/use-cases/validate-social-content.use-case'

/**
 * Domínio social. Começa pelo validador das regras da casa, que é o que o
 * Postiz não faz — a publicação e o agendamento ficam com ele (decisão #1879).
 */
@Module({
  controllers: [SocialController],
  providers: [ValidateSocialContentUseCase],
  exports: [ValidateSocialContentUseCase],
})
export class SocialModule {}
