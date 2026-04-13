import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api/v1')

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true,
  })

  const config = new DocumentBuilder()
    .setTitle('WB Customer API')
    .setDescription('Customer management system — auth, customers, contacts, categories')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 3000
  await app.listen(port)

  console.log(`Application running on http://localhost:${port}/api/v1`)
  console.log(`Swagger docs at http://localhost:${port}/api/docs`)
}

bootstrap()
