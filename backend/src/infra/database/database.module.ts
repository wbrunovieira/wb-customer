import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { IRefreshTokenRepository } from '@/domain/auth/application/repositories/i-refresh-token.repository'
import { IAuthUnitOfWork } from '@/domain/auth/application/repositories/i-auth-unit-of-work'
import { PrismaUserIdentityRepository } from './prisma/repositories/auth/prisma-user-identity.repository'
import { PrismaUserProfileRepository } from './prisma/repositories/auth/prisma-user-profile.repository'
import { PrismaUserAuthorizationRepository } from './prisma/repositories/auth/prisma-user-authorization.repository'
import { PrismaRefreshTokenRepository } from './prisma/repositories/auth/prisma-refresh-token.repository'
import { PrismaAuthUnitOfWork } from './prisma/repositories/auth/prisma-auth-unit-of-work'

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: IUserIdentityRepository, useClass: PrismaUserIdentityRepository },
    { provide: IUserProfileRepository, useClass: PrismaUserProfileRepository },
    { provide: IUserAuthorizationRepository, useClass: PrismaUserAuthorizationRepository },
    { provide: IRefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    { provide: IAuthUnitOfWork, useClass: PrismaAuthUnitOfWork },
  ],
  exports: [
    PrismaService,
    IUserIdentityRepository,
    IUserProfileRepository,
    IUserAuthorizationRepository,
    IRefreshTokenRepository,
    IAuthUnitOfWork,
  ],
})
export class DatabaseModule {}
