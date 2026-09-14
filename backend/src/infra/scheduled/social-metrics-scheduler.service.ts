import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { SyncSocialMetricsUseCase } from '@/domain/social/application/use-cases/sync-social-metrics.use-case'

/**
 * Traz os números dos posts que saíram, uma vez por dia.
 *
 * De madrugada e no fuso de São Paulo porque é quando ninguém está usando o
 * sistema: a coleta é uma requisição por post e divide com o resto o teto de 90
 * por hora do motor. Diária, e não de hora em hora, porque métrica de post não
 * muda a ponto de justificar — e a recoleta dos últimos sete dias já cobre o
 * que demora a estabilizar.
 */
@Injectable()
export class SocialMetricsSchedulerService {
  private readonly logger = new Logger(SocialMetricsSchedulerService.name)

  constructor(private readonly sync: SyncSocialMetricsUseCase) {}

  @Cron('0 4 * * *', { timeZone: 'America/Sao_Paulo', name: 'social-metrics' })
  async collectMetrics(): Promise<void> {
    try {
      const result = await this.sync.execute()
      if (result.isLeft()) return

      const { asked, collected, unavailable } = result.value
      if (asked === 0) return

      this.logger.log(
        `Métricas sociais: ${asked} post(s) perguntado(s), ${collected} guardado(s), ${unavailable} sem dado da rede.`,
      )
    } catch (err) {
      // Não derruba o agendador: amanhã tenta de novo, e a janela de sete dias
      // faz a passada seguinte recuperar o que esta perdeu.
      this.logger.error(
        `Coleta de métricas sociais falhou: ${(err as Error).message}`,
        (err as Error).stack,
      )
    }
  }
}
