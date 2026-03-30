// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy }   from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService }      from '@nestjs/config'
import { PrismaService }      from '../../prisma/prisma.service'
import type { JwtPayload }    from '../auth.service'

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
    const user = await this.prisma.user.findUnique({
      where:   { id: payload.sub },
      include: {
        studentProfile: { select: { id: true, matricula: true } },
        teacherProfile: { select: { id: true } },
      },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o desactivado')
    }

    return {
      id:               user.id,
      email:            user.email,
      role:             user.role,
      firstName:        user.firstName,
      lastName:         user.lastName,
      avatarUrl:        user.avatarUrl,
      studentProfileId: user.studentProfile?.id ?? null,
      teacherProfileId: user.teacherProfile?.id ?? null,
    }
  }
}