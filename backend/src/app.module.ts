// src/app.module.ts
import { Module }              from '@nestjs/common'
import { ConfigModule }        from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD }           from '@nestjs/core'
import { PrismaModule }        from './prisma/prisma.module'
import { AuthModule }          from './auth/auth.module'
import { UsersModule }         from './users/users.module'
import { CoursesModule }       from './courses/courses.module'
import { EnrollmentsModule }   from './enrollments/enrollments.module'
import { PaymentsModule }      from './payments/payments.module'
import { ReportsModule }       from './reports/reports.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 500 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    PaymentsModule,
    ReportsModule,
  ],
  providers: [
    // { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}