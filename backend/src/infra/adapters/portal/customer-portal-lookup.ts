import { Injectable } from '@nestjs/common'
import { ICustomerPortalLookup } from '@/domain/auth/application/services/i-customer-portal-lookup'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

@Injectable()
export class CustomerPortalLookup implements ICustomerPortalLookup {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(
    userId: string,
  ): Promise<{ customerId: string; customerRole: string } | null> {
    const row = await this.prisma.customerUser.findFirst({
      where: { userId, deletedAt: null },
    })
    if (!row) return null
    return { customerId: row.customerId, customerRole: row.customerRole }
  }
}
