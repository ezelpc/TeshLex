// src/users/users.service.ts
import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, Logger,
} from '@nestjs/common'
import { PrismaService }       from '../prisma/prisma.service'
import { Role }                from '@prisma/client'
import bcrypt                  from 'bcryptjs'
import { RegisterStudentDto }  from './dto/register-student.dto'
import { CreateTeacherDto }    from './dto/create-teacher.dto'
import { UpdateUserDto, UpdateUserAdminDto } from './dto/update-user.dto'

// Selección estándar de campos de usuario — nunca devolver password
const USER_SELECT = {
  id:            true,
  email:         true,
  role:          true,
  isActive:      true,
  emailVerified: true,
  firstName:     true,
  lastName:      true,
  phone:         true,
  avatarUrl:     true,
  birthDate:     true,
  lastLoginAt:   true,
  createdAt:     true,
  updatedAt:     true,
} as const

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // REGISTRO DE ALUMNO — público
  // POST /api/users/register
  // ══════════════════════════════════════════════════════════════════════════
  async registerStudent(dto: RegisterStudentDto) {
    // Verificar email único
    const emailExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })
    if (emailExists) {
      throw new ConflictException('Ya existe una cuenta con ese correo electrónico')
    }

    // Verificar matrícula única
    const matriculaExists = await this.prisma.studentProfile.findUnique({
      where: { matricula: dto.matricula },
    })
    if (matriculaExists) {
      throw new ConflictException('La matrícula ya está registrada en el sistema')
    }

    const password = await bcrypt.hash(dto.password, 12)

    const user = await this.prisma.user.create({
      data: {
        email:     dto.email,
        password,
        role:      Role.STUDENT,
        firstName: dto.firstName,
        lastName:  dto.lastName,
        phone:     dto.phone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        studentProfile: {
          create: {
            matricula: dto.matricula,
            curp:      dto.curp,
            career:    dto.career,
            semester:  dto.semester,
          },
        },
      },
      select: {
        ...USER_SELECT,
        studentProfile: true,
      },
    })

    this.logger.log(`Alumno registrado: ${user.email} [${user.studentProfile?.matricula}]`)
    return user
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REGISTRO DE PROFESOR — solo Admin
  // POST /api/users/teachers
  // ══════════════════════════════════════════════════════════════════════════
  async registerTeacher(dto: CreateTeacherDto) {
    const emailExists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })
    if (emailExists) {
      throw new ConflictException('Ya existe una cuenta con ese correo electrónico')
    }

    const password = await bcrypt.hash(dto.password, 12)

    const user = await this.prisma.user.create({
      data: {
        email:     dto.email,
        password,
        role:      Role.TEACHER,
        firstName: dto.firstName,
        lastName:  dto.lastName,
        phone:     dto.phone,
        teacherProfile: {
          create: {
            specialties: dto.specialties ?? [],
            bio:         dto.bio,
          },
        },
      },
      select: {
        ...USER_SELECT,
        teacherProfile: true,
      },
    })

    this.logger.log(`Profesor registrado: ${user.email}`)
    return user
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LISTAR USUARIOS — Admin
  // GET /api/users
  // ══════════════════════════════════════════════════════════════════════════
  async findAll(filters?: {
    role?:     Role
    isActive?: boolean
    search?:   string   // busca en firstName + lastName + email
  }) {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.role     !== undefined && { role:     filters.role }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.search && {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName:  { contains: filters.search, mode: 'insensitive' } },
            { email:     { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        ...USER_SELECT,
        studentProfile: { select: { id: true, matricula: true, career: true } },
        teacherProfile: { select: { id: true, specialties: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VER USUARIO POR ID — Admin o el mismo usuario
  // GET /api/users/:id
  // ══════════════════════════════════════════════════════════════════════════
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where:  { id },
      select: {
        ...USER_SELECT,
        studentProfile: {
          include: {
            enrollments: {
              include: { course: { include: { language: true } } },
              orderBy: { createdAt: 'desc' },
            },
            documents: {
              where:   { status: 'RELEASED' },
              orderBy: { releasedAt: 'desc' },
            },
          },
        },
        teacherProfile: {
          include: {
            courses: {
              where:   { status: 'ACTIVE' },
              include: { language: true },
            },
            comments: {
              where:   { isRead: false },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })

    if (!user) throw new NotFoundException('Usuario no encontrado')
    return user
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTUALIZAR PERFIL PROPIO — usuario autenticado
  // PATCH /api/users/me
  // ══════════════════════════════════════════════════════════════════════════
  async updateMe(id: string, dto: UpdateUserDto) {
    await this.findOne(id)
    return this.prisma.user.update({
      where:  { id },
      data:   dto,
      select: USER_SELECT,
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTUALIZAR USUARIO — Admin (puede cambiar isActive)
  // PATCH /api/users/:id
  // ══════════════════════════════════════════════════════════════════════════
  async updateAdmin(id: string, dto: UpdateUserAdminDto) {
    await this.findOne(id)

    const user = await this.prisma.user.update({
      where:  { id },
      data:   dto,
      select: { ...USER_SELECT, studentProfile: true, teacherProfile: true },
    })

    if (dto.isActive === false) {
      // Revocar todas las sesiones activas al desactivar
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data:  { revokedAt: new Date() },
      })
      this.logger.warn(`Cuenta desactivada: ${user.email}`)
    }

    return user
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LISTAR PROFESORES — todos los roles autenticados
  // GET /api/users/teachers
  // ══════════════════════════════════════════════════════════════════════════
  async getTeachers() {
    return this.prisma.teacherProfile.findMany({
      include: {
        user: {
          select: {
            id:        true,
            firstName: true,
            lastName:  true,
            email:     true,
            avatarUrl: true,
            isActive:  true,
          },
        },
        courses: {
          where:   { status: 'ACTIVE' },
          include: { language: true },
        },
        _count: {
          select: { courses: true },
        },
      },
      orderBy: { user: { lastName: 'asc' } },
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENVIAR COMENTARIO AL ADMIN — Profesor
  // POST /api/users/teachers/comments
  // ══════════════════════════════════════════════════════════════════════════
  async sendTeacherComment(teacherProfileId: string, message: string) {
    // Verificar que el teacherProfileId existe
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherProfileId },
    })
    if (!profile) throw new NotFoundException('Perfil de profesor no encontrado')

    return this.prisma.teacherComment.create({
      data: { teacherId: teacherProfileId, message },
      include: {
        teacher: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADÍSTICAS RÁPIDAS — Admin dashboard
  // GET /api/users/stats
  // ══════════════════════════════════════════════════════════════════════════
  async getStats() {
    const [totalStudents, totalTeachers, activeStudents, inactiveUsers] =
      await Promise.all([
        this.prisma.studentProfile.count(),
        this.prisma.teacherProfile.count(),
        this.prisma.enrollment.groupBy({
          by:    ['studentId'],
          where: { status: 'ACTIVE' },
        }).then(r => r.length),
        this.prisma.user.count({ where: { isActive: false } }),
      ])

    return { totalStudents, totalTeachers, activeStudents, inactiveUsers }
  }
}