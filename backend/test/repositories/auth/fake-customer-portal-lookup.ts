import { ICustomerPortalLookup } from '@/domain/auth/application/services/i-customer-portal-lookup'

export class FakeCustomerPortalLookup implements ICustomerPortalLookup {
  public entries: { userId: string; customerId: string; customerRole: string }[] = []

  async findByUserId(
    userId: string,
  ): Promise<{ customerId: string; customerRole: string } | null> {
    const entry = this.entries.find((e) => e.userId === userId)
    return entry ? { customerId: entry.customerId, customerRole: entry.customerRole } : null
  }
}
