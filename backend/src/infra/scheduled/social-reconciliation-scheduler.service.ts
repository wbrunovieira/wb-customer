import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { ReconcileSocialPublicationsUseCase } from '@/domain/social/application/use-cases/reconcile-social-publications.use-case'
import { NotificationsService } from '@/infra/notifications/notifications.service'

const PROVIDER_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
}

/**
 * Pergunta ao motor, de tempos em tempos, o que aconteceu com o que mandamos
 * publicar — e avisa quando algo falhou.
 *
 * De quinze em quinze minutos porque o dano de uma falha cresce com o tempo em
 * que ninguém sabe dela: um post que não saiu às 9h da terça descoberto no fim
 * do dia já perdeu o dia. E porque o teto do motor é de 90 requisições por
 * hora — quatro passadas por hora, com uma consulta por cliente, cabe folgado.
 */
@Injectable()
export class SocialReconciliationSchedulerService {
  private readonly logger = new Logger(SocialReconciliationSchedulerService.name)

  constructor(
    private readonly reconcile: ReconcileSocialPublicationsUseCase,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('*/15 * * * *', { name: 'social-reconciliation' })
  async reconcilePublications(): Promise<void> {
    try {
      const result = await this.reconcile.execute()
      if (result.isLeft()) return

      const { checked, transitions } = result.value
      if (checked === 0) return

      this.logger.log(
        `Reconciliação social: ${checked} destino(s) conferido(s), ${transitions.length} mudança(s).`,
      )

      for (const transition of transitions) {
        const network = PROVIDER_LABEL[transition.provider] ?? transition.provider

        if (transition.to === 'ERROR') {
          // Transmitido a todos porque não se sabe quem agendou, e um post que
          // não saiu interessa a quem estiver de plantão, não só ao autor.
          this.notifications.pushBroadcast({
            type: 'social.publication.failed',
            title: `Post não saiu no ${network}`,
            body: transition.failureReason ?? 'O motor marcou a publicação como falha.',
            meta: {
              customerId: transition.customerId,
              publicationId: transition.publicationId,
              postizPostId: transition.postizPostId,
              provider: transition.provider,
            },
          })
          this.logger.warn(
            `Publicação ${transition.publicationId} falhou no ${network} (post ${transition.postizPostId}).`,
          )
          continue
        }

        if (transition.to === 'PUBLISHED') {
          this.logger.log(
            `Publicação ${transition.publicationId} saiu no ${network}.`,
          )
        }
      }
    } catch (err) {
      // Um erro aqui não pode derrubar o agendador: a próxima passada tenta de
      // novo, e o estado no banco continua sendo a fonte de verdade.
      this.logger.error(
        `Reconciliação social falhou: ${(err as Error).message}`,
        (err as Error).stack,
      )
    }
  }
}
