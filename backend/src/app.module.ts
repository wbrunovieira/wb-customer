import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { envSchema } from '@/env/env'
import { HealthController } from '@/infra/controllers/health.controller'
import { DatabaseModule } from '@/infra/database/database.module'
import { AuthModule } from '@/infra/modules/auth/auth.module'
import { CustomersModule } from '@/infra/modules/customers/customers.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    DatabaseModule,
    AuthModule,
    CustomersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
