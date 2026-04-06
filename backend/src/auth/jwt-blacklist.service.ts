// src/auth/jwt-blacklist.service.ts
// 🔐 JWT Blacklist Service — Revocación de JTI (JWT ID)
// Usar en memoria para dev, Redis para prod
// Previene reutilización de tokens después de logout/password change
//
// NOTE: Uses $queryRaw/$executeRaw to avoid dependency on generated
//       Prisma client types (allows compilation before `prisma generate`).

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class JwtBlacklistService {
  private readonly logger = new Logger(JwtBlacklistService.name)
  private readonly inMemoryBlacklist: Set<string> = new Set()
  private readonly MAX_MEMORY_SIZE = 10000 // Límite para evitar memory leak

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Agregar un JTI a la lista negra
   * @param jti - JWT ID unique identifier
   * @param expiresAt - Fecha de expiración del token (después no necesita estar en la lista)
   */
  async addToBlacklist(jti: string, expiresAt: Date): Promise<void> {
    try {
      // Guardar en BD para persistencia (producción)
      await this.prisma.$executeRaw`
        INSERT INTO jti_blacklist (id, jti, "expiresAt", "createdAt")
        VALUES (gen_random_uuid(), ${jti}, ${expiresAt}, NOW())
        ON CONFLICT (jti) DO NOTHING
      `

      // También en memoria para lookup rápido
      if (this.inMemoryBlacklist.size >= this.MAX_MEMORY_SIZE) {
        // Limpiar oldest entries si llegamos al límite
        const toDelete = Math.floor(this.MAX_MEMORY_SIZE * 0.1)
        let count = 0
        for (const entry of this.inMemoryBlacklist) {
          if (count >= toDelete) break
          this.inMemoryBlacklist.delete(entry)
          count++
        }
      }

      this.inMemoryBlacklist.add(jti)
      this.logger.debug(`JTI blacklisted: ${jti.slice(0, 20)}... (expires: ${expiresAt.toISOString()})`)
    } catch (error) {
      this.logger.error(`Error blacklisting JTI: ${error.message}`)
      // No fallar si DB está down — usar solo memoria
      this.inMemoryBlacklist.add(jti)
    }
  }

  /**
   * Verificar si un JTI está revocado
   * @param jti - JWT ID a verificar
   * @returns true si está revocado, false si es válido
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    // Lookup rápido en memoria primero
    if (this.inMemoryBlacklist.has(jti)) {
      return true
    }

    // Si no encontrado en memoria, verificar BD (para caso de restart)
    try {
      const records = await this.prisma.$queryRaw<{ jti: string; expiresAt: Date }[]>`
        SELECT jti, "expiresAt" FROM jti_blacklist WHERE jti = ${jti} LIMIT 1
      `
      const record = records[0]

      if (record) {
        // Si ya expiró, no importa que esté blacklisted
        if (record.expiresAt < new Date()) {
          return false
        }

        // Agregar a memoria para futuros lookups
        this.inMemoryBlacklist.add(jti)
        return true
      }

      return false
    } catch (error) {
      this.logger.warn(`Error checking blacklist in DB: ${error.message}`)
      // Error en DB — asumir válido (no denegar acceso duplicadamente)
      return false
    }
  }

  /**
   * Limpiar JTI expirados de la BD (cron job)
   * Ejecutar: cada hora en producción
   */
  async cleanupExpiredJTIs(): Promise<number> {
    try {
      const result = await this.prisma.$executeRaw`
        DELETE FROM jti_blacklist WHERE "expiresAt" < NOW()
      `
      this.logger.log(`Cleaned up ${result} expired JTIs`)
      return result
    } catch (error) {
      this.logger.error(`Error cleaning up JTIs: ${error.message}`)
      return 0
    }
  }

  /**
   * Revocar todos los tokens de un usuario (por cambio de contraseña, etc)
   * @param userId - Usuario a revocar todos los tokens
   */
  async revokeUserTokens(userId: string): Promise<void> {
    try {
      // Buscar todos los tokens activos del usuario que no han expirado
      const tokens = await this.prisma.$queryRaw<{ id: string; expiresAt: Date }[]>`
        SELECT id, "expiresAt" FROM refresh_tokens
        WHERE "userId" = ${Prisma.sql`${userId}::uuid`}
          AND "revokedAt" IS NULL
          AND "expiresAt" > NOW()
      `

      if (tokens.length === 0) return

      // Blacklist todos los JTIs asociados (convención: userId:tokenId)
      for (const t of tokens) {
        await this.prisma.$executeRaw`
          INSERT INTO jti_blacklist (id, jti, "expiresAt", "createdAt")
          VALUES (gen_random_uuid(), ${`${userId}:${t.id}`}, ${t.expiresAt}, NOW())
          ON CONFLICT (jti) DO NOTHING
        `
        this.inMemoryBlacklist.add(`${userId}:${t.id}`)
      }

      this.logger.log(`Revoked ${tokens.length} tokens for user ${userId}`)
    } catch (error) {
      this.logger.error(`Error revoking user tokens: ${error.message}`)
    }
  }

  /**
   * Obtener estadísticas de blacklist (para monitoreo)
   */
  async getStats(): Promise<{ memorySize: number; dbSize: number }> {
    try {
      const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM jti_blacklist
      `
      const dbSize = Number(rows[0]?.count ?? 0)
      return {
        memorySize: this.inMemoryBlacklist.size,
        dbSize,
      }
    } catch (error) {
      this.logger.error(`Error getting stats: ${error.message}`)
      return { memorySize: this.inMemoryBlacklist.size, dbSize: 0 }
    }
  }
}
