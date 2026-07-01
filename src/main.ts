import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import fastifyMultipart from '@fastify/multipart'
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  )
  const config = app.get(ConfigService)
  const origins = config
    .getOrThrow<string>('FRONTEND_URL')
    .split(',')
    .map((origin) => origin.trim())

  app.setGlobalPrefix('api')
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 6,
    },
  })
  app.enableCors({
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: origins,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  )

  const port = config.getOrThrow<number>('PORT')

  await app.listen(port, '0.0.0.0')
}

void bootstrap()
