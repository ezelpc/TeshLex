// src/main.ts (DIAGNOSTIC RELOAD)
import './dns-fix'
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
import * as express from 'express'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app    = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  const port    = config.get<number>('PORT', 3000)
  const nodeEnv = config.get('NODE_ENV', 'development')
  const origins = config.get('CORS_ORIGINS', 'http://localhost:5173')

  app.setGlobalPrefix('api')


  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    // Strict-Transport-Security: HTTPS only por 1 año + subdomains
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Content-Security-Policy estricta
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'nonce-{{NONCE}}'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", process.env.FRONTEND_URL ?? 'http://localhost:5173'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
      },
    },
    // X-Frame-Options: Deny clickjacking
    frameguard: { action: 'deny' },
    // X-Content-Type-Options: nosniff
    noSniff: true,
    // X-XSS-Protection (legacy pero no duele)
    xssFilter: true,
    // Referrer-Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }))
  // CORS — Validar origen con URL parsing (prevenir bypass)
  const corsOrigins = origins.split(',').map((o: string) => o.trim())
  app.enableCors({
    origin: (requestOrigin: string | undefined, callback) => {
      if (!requestOrigin || corsOrigins.includes(requestOrigin)) {
        callback(null, true)
      } else {
        // Log sospechoso
        logger.warn(`❌ CORS REJECT: ${requestOrigin}`)
        callback(new Error('Not allowed by CORS'), false)
      }
    },
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials:    true,
    maxAge:         3600,  // Preflight cache
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