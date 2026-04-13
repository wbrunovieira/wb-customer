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
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'
import { ICustomerCategoryRepository } from '@/domain/customers/application/repositories/i-customer-category.repository'
import { IContactRepository } from '@/domain/customers/application/repositories/i-contact.repository'
import { ICustomerActivityRepository } from '@/domain/customers/application/repositories/i-customer-activity.repository'
import { ICustomerFolderService } from '@/domain/customers/application/services/i-customer-folder.service'
import { PrismaCustomerRepository } from './prisma/repositories/customers/prisma-customer.repository'
import { PrismaCustomerCategoryRepository } from './prisma/repositories/customers/prisma-customer-category.repository'
import { PrismaContactRepository } from './prisma/repositories/customers/prisma-contact.repository'
import { PrismaCustomerActivityRepository } from './prisma/repositories/customers/prisma-customer-activity.repository'
import { LocalCustomerFolderService } from '@/infra/adapters/storage/local-customer-folder.service'

@Global()
@Module({
  providers: [
    PrismaService,
    // Auth
    { provide: IUserIdentityRepository, useClass: PrismaUserIdentityRepository },
    { provide: IUserProfileRepository, useClass: PrismaUserProfileRepository },
    { provide: IUserAuthorizationRepository, useClass: PrismaUserAuthorizationRepository },
    { provide: IRefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    { provide: IAuthUnitOfWork, useClass: PrismaAuthUnitOfWork },
    // Customers
    { provide: ICustomerRepository, useClass: PrismaCustomerRepository },
    { provide: ICustomerCategoryRepository, useClass: PrismaCustomerCategoryRepository },
    { provide: IContactRepository, useClass: PrismaContactRepository },
    { provide: ICustomerActivityRepository, useClass: PrismaCustomerActivityRepository },
    { provide: ICustomerFolderService, useClass: LocalCustomerFolderService },
  ],
  exports: [
    PrismaService,
    IUserIdentityRepository,
    IUserProfileRepository,
    IUserAuthorizationRepository,
    IRefreshTokenRepository,
    IAuthUnitOfWork,
    ICustomerRepository,
    ICustomerCategoryRepository,
    IContactRepository,
    ICustomerActivityRepository,
    ICustomerFolderService,
  ],
})
export class DatabaseModule {}
