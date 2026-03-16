// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { JwtService }    from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { Role }          from '@prisma/client'
import bcrypt            from 'bcryptjs'
import { randomUUID }    from 'node:crypto'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface JwtPayload {
  sub:   string   // userId (UUID)
  email: string
  role:  Role
  jti:   string   // JWT ID único por token
}

export interface AuthTokens {
  accessToken:  string  // JWT de corta duración (15 min)
  refreshToken: string  // Token de larga duración (7 días)
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma:  PrismaService,
    private readonly jwt:     JwtService,
    private readonly config:  ConfigService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // POST /api/auth/login
  // ══════════════════════════════════════════════════════════════════════════
  async login(
    email:      string,
    password:   string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Buscar usuario — normalize email
    const user = await this.prisma.user.findUnique({
      where:   { email: email.toLowerCase().trim() },
      include: {
        studentProfile: {
          select: { id: true, matricula: true, career: true, semester: true },
        },
        teacherProfile: {
          select: { id: true, specialties: true },
        },
      },
    })

    // Mismo mensaje para "no existe" y "contraseña incorrecta"
    // para evitar enumeración de usuarios
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tu cuenta está desactivada. Contacta a administración.',
      )
    }

    // 2. Verificar contraseña con bcrypt
    const passwordOk = await bcrypt.compare(password, user.password)
    if (!passwordOk) {
      this.logger.warn(`Login fallido — ${email} desde ${ipAddress ?? 'IP desconocida'}`)
      throw new UnauthorizedException('Credenciales incorrectas')
    }

    // 3. Generar access token + refresh token
    const tokens = await this.generateTokens(user.id, user.email, user.role)

    // 4. Persistir refresh token + actualizar lastLoginAt (paralelo)
    await Promise.all([
      this.prisma.refreshToken.create({
        data: {
          userId:    user.id,
          token:     tokens.refreshToken,
          expiresAt: new Date(Date.now() + this.refreshTtlMs()),
          ipAddress,
          userAgent,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data:  {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress ?? null,
        },
      }),
    ])

    // 5. Registrar en auditoría
    await this.prisma.auditLog.create({
      data: {
        userId:    user.id,
        action:    'USER_LOGIN',
        entity:    'User',
        entityId:  user.id,
        ipAddress,
        userAgent,
      },
    })

    this.logger.log(`✅ Login: ${user.email} [${user.role}]`)

    // 6. Respuesta — incluye datos útiles para el frontend
    return {
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id:               user.id,
        email:            user.email,
        role:             user.role,
        firstName:        user.firstName,
        lastName:         user.lastName,
        avatarUrl:        user.avatarUrl ?? null,
        // IDs de perfil según rol — el frontend los necesita para sus queries
        studentProfileId: user.studentProfile?.id    ?? null,
        teacherProfileId: user.teacherProfile?.id    ?? null,
        // Datos extra para evitar un segundo request al arrancar
        studentData:      user.studentProfile ?? null,
        teacherData:      user.teacherProfile ?? null,
      },
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REFRESH TOKEN
  // POST /api/auth/refresh
  // ══════════════════════════════════════════════════════════════════════════
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const record = await this.prisma.refreshToken.findUnique({
      where:   { token: refreshToken },
      include: { user: true },
    })

    // Rechazar si no existe, está revocado o expiró
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Sesión expirada. Por favor inicia sesión nuevamente.',
      )
    }

    if (!record.user.isActive) {
      throw new UnauthorizedException('Tu cuenta está desactivada.')
    }

    // Rotación: revocar el token usado y emitir uno nuevo
    const newTokens = await this.generateTokens(
      record.user.id,
      record.user.email,
      record.user.role,
    )

    await Promise.all([
      this.prisma.refreshToken.update({
        where: { id: record.id },
        data:  { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId:    record.user.id,
          token:     newTokens.refreshToken,
          expiresAt: new Date(Date.now() + this.refreshTtlMs()),
          ipAddress: record.ipAddress,
          userAgent: record.userAgent,
        },
      }),
    ])

    return newTokens
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOGOUT
  // POST /api/auth/logout
  // ══════════════════════════════════════════════════════════════════════════
  async logout(
    userId:        string,
    refreshToken?: string,
    ipAddress?:    string,
  ) {
    if (refreshToken) {
      // Revocar solo la sesión actual
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken, revokedAt: null },
        data:  { revokedAt: new Date() },
      })
    } else {
      // Revocar TODAS las sesiones activas
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data:  { revokedAt: new Date() },
      })
    }

    await this.prisma.auditLog.create({
      data: { userId, action: 'USER_LOGOUT', entity: 'User', entityId: userId, ipAddress },
    })

    return { message: 'Sesión cerrada correctamente' }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CAMBIAR CONTRASEÑA
  // POST /api/auth/change-password
  // ══════════════════════════════════════════════════════════════════════════
  async changePassword(
    userId:          string,
    currentPassword: string,
    newPassword:     string,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      throw new BadRequestException('La contraseña actual es incorrecta')
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la actual',
      )
    }

    const hashed = await bcrypt.hash(newPassword, 12)

    await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data:  { password: hashed },
      }),
      // Revocar todas las sesiones por seguridad
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data:  { revokedAt: new Date() },
      }),
    ])

    await this.prisma.auditLog.create({
      data: {
        userId,
        action:   'USER_PASSWORD_CHANGED',
        entity:   'User',
        entityId: userId,
      },
    })

    return { message: 'Contraseña actualizada. Por favor inicia sesión nuevamente.' }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET ME
  // GET /api/auth/me
  // ══════════════════════════════════════════════════════════════════════════
  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where:  { id: userId },
      select: {
        id:            true,
        email:         true,
        role:          true,
        firstName:     true,
        lastName:      true,
        phone:         true,
        avatarUrl:     true,
        emailVerified: true,
        lastLoginAt:   true,
        createdAt:     true,
        studentProfile: {
          select: {
            id:        true,
            matricula: true,
            career:    true,
            semester:  true,
            enrollments: {
              where:   { status: { in: ['ACTIVE', 'COMPLETED'] } },
              include: { course: { include: { language: true } } },
              orderBy: { enrolledAt: 'desc' },
              take:    5,
            },
          },
        },
        teacherProfile: {
          select: {
            id:          true,
            specialties: true,
            bio:         true,
            maxStudents: true,
            courses: {
              where:   { status: 'ACTIVE' },
              include: { language: true },
            },
          },
        },
      },
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS PRIVADOS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Genera un par de tokens:
   *  - accessToken:  JWT firmado con JWT_ACCESS_SECRET, expira en 15m
   *  - refreshToken: JWT firmado con JWT_REFRESH_SECRET, expira en 7d
   *
   * El accessToken incluye el payload completo (sub, email, role, jti).
   * El refreshToken solo incluye sub y jti — minimiza la información expuesta.
   */
  private async generateTokens(
    userId: string,
    email:  string,
    role:   Role,
  ): Promise<AuthTokens> {
    const jti = randomUUID()

    // Payload del access token
    const accessPayload: JwtPayload = {
      sub:   userId,
      email,
      role,
      jti,
    }

    // Payload mínimo del refresh token
    const refreshPayload = {
      sub: userId,
      jti: randomUUID(), // JTI diferente al del access token
    }

    // as any: @nestjs/jwt espera StringValue pero string funciona en runtime
    const aExp = this.config.get('JWT_ACCESS_EXPIRES_IN',  '15m')
    const rExp = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d')

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload as any, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: aExp as any,
      }),
      this.jwt.signAsync(refreshPayload as any, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: rExp as any,
      }),
    ])

    return { accessToken, refreshToken }
  }

  /** Convierte JWT_REFRESH_EXPIRES_IN a milisegundos para guardar en BD */
  private refreshTtlMs(): number {
    const raw  = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')
    const days = parseInt(raw.replace('d', ''), 10)
    return (isNaN(days) ? 7 : days) * 24 * 60 * 60 * 1000
  }
}