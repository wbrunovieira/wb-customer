import { Module } from '@nestjs/common'
import { CreativesController } from '@/infra/controllers/creatives.controller'
import { CreativeStrategiesController } from '@/infra/controllers/creative-strategies.controller'
import { CreateCreativeUseCase } from '@/domain/creatives/application/use-cases/create-creative.use-case'
import { UploadCreativeFileUseCase } from '@/domain/creatives/application/use-cases/upload-creative-file.use-case'
import { GetCreativeUseCase } from '@/domain/creatives/application/use-cases/get-creative.use-case'
import { ListCreativesUseCase } from '@/domain/creatives/application/use-cases/list-creatives.use-case'
import { UpdateCreativeUseCase } from '@/domain/creatives/application/use-cases/update-creative.use-case'
import { DeleteCreativeUseCase } from '@/domain/creatives/application/use-cases/delete-creative.use-case'
import { AddCreativePerformanceUseCase } from '@/domain/creatives/application/use-cases/add-creative-performance.use-case'
import { GetCreativePerformanceSummaryUseCase } from '@/domain/creatives/application/use-cases/get-creative-performance-summary.use-case'
import { CreateCreativeStrategyUseCase } from '@/domain/creatives/application/use-cases/create-creative-strategy.use-case'
import { UpdateCreativeStrategyUseCase } from '@/domain/creatives/application/use-cases/update-creative-strategy.use-case'
import { DeleteCreativeStrategyUseCase } from '@/domain/creatives/application/use-cases/delete-creative-strategy.use-case'
import { GetCreativeStrategyComparisonUseCase } from '@/domain/creatives/application/use-cases/get-creative-strategy-comparison.use-case'
import { ListCreativeStrategiesUseCase } from '@/domain/creatives/application/use-cases/list-creative-strategies.use-case'
import { ICreativeRepository } from '@/domain/creatives/application/repositories/i-creative.repository'
import { ICreativeStrategyRepository } from '@/domain/creatives/application/repositories/i-creative-strategy.repository'
import { ICreativePerformanceRepository } from '@/domain/creatives/application/repositories/i-creative-performance.repository'
import { ICreativesFolderService } from '@/domain/creatives/application/services/i-creatives-folder.service'
import { PrismaCreativeRepository } from '@/infra/database/prisma/repositories/creatives/prisma-creative.repository'
import { PrismaCreativeStrategyRepository } from '@/infra/database/prisma/repositories/creatives/prisma-creative-strategy.repository'
import { PrismaCreativePerformanceRepository } from '@/infra/database/prisma/repositories/creatives/prisma-creative-performance.repository'
import { GoogleCreativesFolderService } from '@/infra/adapters/storage/google-creatives-folder.service'
import { IStorageAdapter } from '@/domain/documents/application/services/i-storage.adapter'
import { ICustomerRepository } from '@/domain/customers/application/repositories/i-customer.repository'

@Module({
  controllers: [CreativesController, CreativeStrategiesController],
  providers: [
    // Use-cases
    CreateCreativeUseCase,
    UploadCreativeFileUseCase,
    GetCreativeUseCase,
    ListCreativesUseCase,
    UpdateCreativeUseCase,
    DeleteCreativeUseCase,
    AddCreativePerformanceUseCase,
    GetCreativePerformanceSummaryUseCase,
    CreateCreativeStrategyUseCase,
    UpdateCreativeStrategyUseCase,
    DeleteCreativeStrategyUseCase,
    ListCreativeStrategiesUseCase,
    GetCreativeStrategyComparisonUseCase,

    // Repository bindings
    { provide: ICreativeRepository, useClass: PrismaCreativeRepository },
    { provide: ICreativeStrategyRepository, useClass: PrismaCreativeStrategyRepository },
    { provide: ICreativePerformanceRepository, useClass: PrismaCreativePerformanceRepository },

    // Service bindings
    { provide: ICreativesFolderService, useClass: GoogleCreativesFolderService },
  ],
})
export class CreativesModule {}
