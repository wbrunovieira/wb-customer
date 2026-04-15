import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

export interface PhoneMatchResult {
  customerId: string
  contactId?: string
}

/**
 * Normalizes phone numbers and attempts to match to a Contact or Customer.
 *
 * Match priority: Contact.phone → Customer.phone
 *
 * Normalization: strip all non-digits, then test:
 *   - full number as-is
 *   - with "55" prefix (Brazil)
 *   - without "55" prefix
 *   - without country code (last 10/11 digits)
 */
@Injectable()
export class GoToPhoneMatcherService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the first matching customer (and optional contact) for a phone number.
   * Returns null if no match found.
   */
  async match(rawPhone: string): Promise<PhoneMatchResult | null> {
    const variants = this.buildVariants(rawPhone)
    if (variants.length === 0) return null

    // 1. Try Contact first
    const contact = await this.prisma.contact.findFirst({
      where: {
        phone: { in: variants },
        customer: { deletedAt: null },
      },
      select: { id: true, customerId: true },
    })
    if (contact) return { customerId: contact.customerId, contactId: contact.id }

    // 2. Fallback to Customer
    const customer = await this.prisma.customer.findFirst({
      where: {
        phone: { in: variants },
        deletedAt: null,
      },
      select: { id: true },
    })
    if (customer) return { customerId: customer.id }

    return null
  }

  /** Normalize to digits only */
  normalize(raw: string): string {
    return raw.replace(/\D/g, '')
  }

  buildVariants(raw: string): string[] {
    const digits = this.normalize(raw)
    if (!digits) return []

    const variants = new Set<string>()
    variants.add(digits)

    // With Brazilian country code
    if (!digits.startsWith('55')) variants.add(`55${digits}`)

    // Without country code (remove leading 55 if present and length > 11)
    if (digits.startsWith('55') && digits.length > 11) {
      variants.add(digits.slice(2))
    }

    // Last 11 digits (DDD + number)
    if (digits.length > 11) variants.add(digits.slice(-11))

    // Last 10 digits (without 9th digit)
    if (digits.length > 10) variants.add(digits.slice(-10))

    return Array.from(variants)
  }
}
