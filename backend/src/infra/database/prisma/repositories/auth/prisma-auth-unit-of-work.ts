import { Injectable } from '@nestjs/common'
import { IAuthUnitOfWork } from '@/domain/auth/application/repositories/i-auth-unit-of-work'
import { PrismaService } from '../../prisma.service'

@Injectable()
export class PrismaAuthUnitOfWork implements IAuthUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(() => fn())
  }
}
