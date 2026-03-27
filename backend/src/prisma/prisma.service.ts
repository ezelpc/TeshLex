// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaClient }  from '@prisma/client'
import { PrismaPg }      from '@prisma/adapter-pg'
import { Pool }          from 'pg'

import { execSync } from 'child_process'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)
  private readonly pgPool: Pool

  constructor(private readonly config: ConfigService) {
    let connectionString = config.getOrThrow<string>('DATABASE_URL')
    if (connectionString.includes('@postgres:')) {
      try {
        const ip = execSync("getent hosts postgres | awk '{print $1}'").toString().trim()
        if (ip) {
          connectionString = connectionString.replace('@postgres:', `@${ip}:`)
        }
      } catch (e) {
        // Fallback or ignore
      }
    }
    const pool    = new Pool({ connectionString })
    const adapter = new PrismaPg(pool as any)
    super({ adapter })
    this.pgPool = pool
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('✅ Prisma conectado a PostgreSQL')
  }

  async onModuleDestroy() {
    await this.$disconnect()
    await this.pgPool.end()
    this.logger.log('🔌 Prisma desconectado')
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase solo puede usarse en entorno de test')
    }
    const tables = await this.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `
    for (const { tablename } of tables) {
      if (tablename !== '_prisma_migrations') {
        await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE`)
      }
    }
  }
}