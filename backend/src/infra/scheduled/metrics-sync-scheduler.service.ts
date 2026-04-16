import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { SyncCampaignMetricsUseCase } from '@/domain/paid-traffic/application/use-cases/sync-campaign-metrics.use-case'
import { ICampaignRepository } from '@/domain/paid-traffic/application/repositories/i-campaign.repository'

@Injectable()
export class MetricsSyncSchedulerService {
  private readonly logger = new Logger(MetricsSyncSchedulerService.name)

  constructor(
    private readonly syncUseCase: SyncCampaignMetricsUseCase,
    private readonly campaignRepo: ICampaignRepository,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async syncAllPublishedCampaigns(): Promise<void> {
    this.logger.log('Starting daily metrics sync for all published campaigns...')

    const campaigns = await this.campaignRepo.findAllPublished()

    this.logger.log(`Found ${campaigns.length} published campaigns to sync`)

    for (const campaign of campaigns) {
      try {
        const result = await this.syncUseCase.execute({ campaignId: campaign.id.value })
        if (result.isRight()) {
          this.logger.log(
            `Synced ${result.value.synced} metrics for campaign ${campaign.id.value} ("${campaign.name}")`,
          )
        } else {
          this.logger.warn(
            `Sync skipped for campaign ${campaign.id.value}: ${(result.value as Error).message}`,
          )
        }
      } catch (err) {
        this.logger.error(
          `Unexpected error syncing campaign ${campaign.id.value}: ${(err as Error).message}`,
          (err as Error).stack,
        )
      }
    }

    this.logger.log('Daily metrics sync complete')
  }
}
