// src/auth/jwt-blacklist.service.ts
// 🔐 JWT Blacklist Service — Revocación de JTI (JWT ID)
// Usar en memoria para dev, Redis para prod
// Previene reutilización de tokens después de logout/password change

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
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
      await this.prisma.jTIBlacklist.create({
        data: {
          jti,
          expiresAt,
        },
      })

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
      const record = await this.prisma.jTIBlacklist.findUnique({
        where: { jti },
      })

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
      const result = await this.prisma.jTIBlacklist.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      })

      this.logger.log(`Cleaned up ${result.count} expired JTIs`)
      return result.count
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
      const tokens = await this.prisma.refreshToken.findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      })

      // Blacklist todos los JTIs asociados (extraer de token si es necesario)
      for (const token of tokens) {
        // Si el token tiene metadata con jti, agregar a blacklist
        // De lo contrario, confiar en que refresh token revocation es suficiente
        await this.prisma.jTIBlacklist.createMany({
          data: tokens.map((t) => ({
            jti: `${userId}:${t.id}`, // Convención: userId:tokenId como JTI
            expiresAt: t.expiresAt,
          })),
          skipDuplicates: true,
        })
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
      const dbSize = await this.prisma.jTIBlacklist.count()
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
