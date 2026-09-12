import {
  AttributedConversationRow,
  ISocialAttributionReportRepository,
} from '../../repositories/i-social-attribution-report.repository'

export class InMemorySocialAttributionReportRepository
  implements ISocialAttributionReportRepository
{
  public items: AttributedConversationRow[] = []

  async findAttributedConversations(
    customerId: string,
    since: Date,
  ): Promise<AttributedConversationRow[]> {
    return this.items.filter(
      (r) => r.customerId === customerId && r.occurredAt >= since,
    )
  }
}
