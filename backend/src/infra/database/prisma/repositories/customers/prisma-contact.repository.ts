import { Injectable } from '@nestjs/common'
import { IContactRepository } from '@/domain/customers/application/repositories/i-contact.repository'
import { Contact } from '@/domain/customers/enterprise/entities/contact'
import { PrismaService } from '../../prisma.service'
import { ContactMapper } from '../../mappers/customers/contact.mapper'

@Injectable()
export class PrismaContactRepository implements IContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Contact | null> {
    const raw = await this.prisma.contact.findUnique({ where: { id } })
    return raw ? ContactMapper.toDomain(raw) : null
  }

  async findByCustomerId(customerId: string): Promise<Contact[]> {
    const raws = await this.prisma.contact.findMany({
      where: { customerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })
    return raws.map(ContactMapper.toDomain)
  }

  async save(contact: Contact): Promise<void> {
    const data = ContactMapper.toPrisma(contact)
    await this.prisma.contact.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contact.delete({ where: { id } })
  }
}
