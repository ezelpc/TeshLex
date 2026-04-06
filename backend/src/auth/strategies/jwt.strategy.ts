// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy }   from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService }      from '@nestjs/config'
import { PrismaService }      from '../../prisma/prisma.service'
import type { JwtPayload }    from '../auth.service'

// Cache in-memory con TTL de 60 segundos para mitigar carga en BD
const userCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL_MS = 60_000 // 60 segundos

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config:                  ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => {
          let token = null;
          if (req && req.headers && req.headers.cookie) {
            const cookies = req.headers.cookie.split(';').reduce((acc: any, c: string) => {
              const [k, v] = c.trim().split('=')
              return { ...acc, [k]: v }
            }, {})
            token = cookies['accessToken']
          }
          return token || ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:      config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    })
  }

  async validate(payload: JwtPayload) {
    const cacheKey = payload.sub
    const now      = Date.now()
    const cached   = userCache.get(cacheKey)

    // Retornar del caché si no ha expirado
    if (cached && cached.expiresAt > now) {
      return cached.data
    }

    const user = await this.prisma.user.findUnique({
      where:   { id: payload.sub },
      include: {
        studentProfile: { select: { id: true, matricula: true } },
        teacherProfile: { select: { id: true } },
      },
    })

    if (!user || !user.isActive) {
      userCache.delete(cacheKey) // limpiar caché si el usuario fue desactivado
      throw new UnauthorizedException('Usuario no encontrado o desactivado')
    }

    const userData = {
      id:               user.id,
      email:            user.email,
      role:             user.role,
      firstName:        user.firstName,
      lastName:         user.lastName,
      avatarUrl:        user.avatarUrl,
      studentProfileId: user.studentProfile?.id ?? null,
      teacherProfileId: user.teacherProfile?.id ?? null,
    }

    // Guardar en caché con TTL
    userCache.set(cacheKey, { data: userData, expiresAt: now + CACHE_TTL_MS })

    // Limpieza periódica del caché (evitar memory leak)
    if (userCache.size > 1000) {
      for (const [key, val] of userCache.entries()) {
        if (val.expiresAt <= now) userCache.delete(key)
      }
    }

    return userData
  }
}