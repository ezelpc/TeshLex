// src/app.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    // Rate limiting diferenciado por endpoint 🔒
    ThrottlerModule.forRoot([
      {
        // Global: 300 req/15min (20 req/min) — estándar
        name: 'global',
        ttl: 900_000, // 15 minutos
        limit: 300,
      },
      {
        // Login: 5 intentos cada 5 minutos — anti-brute-force 🛡️
        name: 'auth_login',
        ttl: 300_000, // 5 minutos
        limit: 5,
      },
      {
        // Refresh token: 10 intentos cada 5 minutos
        name: 'auth_refresh',
        ttl: 300_000,
        limit: 10,
      },
      {
        // Health check: 100 req/min (debe ser rápido)
        name: 'health',
        ttl: 60_000,
        limit: 100,
      },
      {
        // API read (GET): 60 req/min
        name: 'read',
        ttl: 60_000,
        limit: 60,
      },
      {
        // API write (POST/PUT/PATCH): 30 req/min — más restrictivo
        name: 'write',
        ttl: 60_000,
        limit: 30,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    PaymentsModule,
    ReportsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
