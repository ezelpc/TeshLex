// src/main.ts
import { NestFactory }    from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService }  from '@nestjs/config'
import helmet             from 'helmet'
// FIX: compression con require para evitar error "no call signatures"
import compression = require('compression')
import { AppModule }      from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { TransformInterceptor }  from './common/interceptors/transform.interceptor'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app    = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  const port    = config.get<number>('PORT', 3000)
  const nodeEnv = config.get('NODE_ENV', 'development')
  const origins = config.get('CORS_ORIGINS', 'http://localhost:5173')

  app.setGlobalPrefix('api')

  app.use(helmet({ crossOriginEmbedderPolicy: false }))
  app.enableCors({
    origin:         origins.split(',').map((o: string) => o.trim()),
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials:    true,
  })
  app.use(compression())

  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,
    forbidNonWhitelisted: true,
    transform:            true,
    transformOptions:     { enableImplicitConversion: true },
  }))

  app.useGlobalFilters(new GlobalExceptionFilter())
  app.useGlobalInterceptors(new TransformInterceptor())

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TeshLex API')
      .setDescription('Sistema de Gestión de Cursos de Idiomas — TESH')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'JWT-Auth',
      )
      .addTag('Auth',        'Login, logout, refresh de tokens')
      .addTag('Users',       'Alumnos y profesores')
      .addTag('Courses',     'Cursos, niveles, idiomas')
      .addTag('Enrollments', 'Inscripciones y calificaciones')
      .addTag('Payments',    'Pagos con Mercado Pago')
      .addTag('Reports',     'Dashboard administrativo')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    })
    logger.log(`📚 Swagger: http://localhost:${port}/api/docs`)
  }

  await app.listen(port)
  logger.log(`🚀 Backend: http://localhost:${port}/api`)
  logger.log(`🌍 Entorno: ${nodeEnv}`)
}

bootstrap()