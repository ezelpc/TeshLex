// src/courses/courses.service.ts
import {
  Injectable, NotFoundException,
  ConflictException, BadRequestException, Logger,
} from '@nestjs/common'
import { PrismaService }        from '../prisma/prisma.service'
import { CourseStatus, LanguageLevel, CourseModality } from '@prisma/client'
import { CreateCourseDto }      from './dto/create-course.dto'
import { UpdateCourseDto }      from './dto/update-course.dto'
import { CreateLanguageDto }    from './dto/create-language.dto'
import { CreateCycleDto }       from './dto/create-cycle.dto'
import { AddEvaluationCriteriaDto } from './dto/evaluation-criteria.dto'

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name)

  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // CURSOS
  // ══════════════════════════════════════════════════════════════════════════

  async findAll(filters?: {
    languageId?: string
    level?:      LanguageLevel
    modality?:   CourseModality
    status?:     CourseStatus
    teacherId?:  string
    cycleId?:    string
  }) {
    return this.prisma.course.findMany({
      where: {
        ...(filters?.languageId && { languageId: filters.languageId }),
        ...(filters?.level      && { level:      filters.level }),
        ...(filters?.modality   && { modality:   filters.modality }),
        ...(filters?.status     && { status:     filters.status }),
        ...(filters?.teacherId  && { teacherId:  filters.teacherId }),
        ...(filters?.cycleId    && { cycleId:    filters.cycleId }),
      },
      include: {
        language: true,
        cycle:    { select: { id: true, name: true, code: true } },
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
        evaluationCriteria: { orderBy: { order: 'asc' } },
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ language: { name: 'asc' } }, { level: 'asc' }],
    })
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where:   { id },
      include: {
        language: true,
        cycle:    true,
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
        evaluationCriteria: { orderBy: { order: 'asc' } },
        enrollments: {
          where:   { status: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
            grades: true,
          },
          orderBy: { enrolledAt: 'desc' },
        },
        _count: { select: { enrollments: true } },
      },
    })

    if (!course) throw new NotFoundException(`Curso no encontrado`)
    return course
  }

  async create(dto: CreateCourseDto) {
    // Verificar que el idioma existe
    const language = await this.prisma.language.findUnique({
      where: { id: dto.languageId },
    })
    if (!language) throw new NotFoundException('Idioma no encontrado')

    // Verificar que el profesor existe si se provee
    if (dto.teacherId) {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { id: dto.teacherId },
      })
      if (!teacher) throw new NotFoundException('Profesor no encontrado')
    }

    const course = await this.prisma.course.create({
      data: {
        languageId:          dto.languageId,
        level:               dto.level,
        modality:            dto.modality,
        scheduleDescription: dto.scheduleDescription,
        startTime:           dto.startTime,
        endTime:             dto.endTime,
        startDate:           new Date(dto.startDate),
        endDate:             new Date(dto.endDate),
        daysOfWeek:          dto.daysOfWeek,
        maxStudents:         dto.maxStudents  ?? 35,
        enrollmentFee:       dto.enrollmentFee ?? 1500,
        monthlyFee:          dto.monthlyFee   ?? 0,
        materialFee:         dto.materialFee  ?? 0,
        teacherId:           dto.teacherId,
        cycleId:             dto.cycleId,
        description:         dto.description,
        notes:               dto.notes,
      },
      include: { language: true, cycle: true, evaluationCriteria: true },
    })

    this.logger.log(`Curso creado: ${language.name} ${dto.level}`)
    return course
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id)

    return this.prisma.course.update({
      where: { id },
      data:  {
        ...dto,
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate   && { endDate:   new Date(dto.endDate) }),
      },
      include: { language: true, cycle: true, evaluationCriteria: true },
    })
  }

  // Duplicar curso para un nuevo ciclo escolar
  async duplicate(id: string, targetCycleId?: string) {
    const original = await this.findOne(id)

    const copy = await this.prisma.course.create({
      data: {
        languageId:          original.languageId,
        level:               original.level,
        modality:            original.modality,
        status:              CourseStatus.DRAFT,
        cycleId:             targetCycleId ?? original.cycleId,
        scheduleDescription: original.scheduleDescription,
        startTime:           original.startTime,
        endTime:             original.endTime,
        startDate:           original.startDate,
        endDate:             original.endDate,
        daysOfWeek:          original.daysOfWeek,
        maxStudents:         original.maxStudents,
        currentStudents:     0,
        enrollmentFee:       original.enrollmentFee,
        monthlyFee:          original.monthlyFee,
        materialFee:         original.materialFee,
        teacherId:           original.teacherId,
        description:         original.description,
        notes:               original.notes,
        evaluationCriteria: {
          create: original.evaluationCriteria.map(c => ({
            name:        c.name,
            percentage:  c.percentage,
            description: c.description,
            order:       c.order,
          })),
        },
      },
      include: { language: true, cycle: true, evaluationCriteria: true },
    })

    this.logger.log(`Curso duplicado: ${copy.id} desde ${id}`)
    return copy
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CRITERIOS DE EVALUACIÓN
  // ══════════════════════════════════════════════════════════════════════════

  async addEvaluationCriteria(courseId: string, dto: AddEvaluationCriteriaDto) {
    await this.findOne(courseId)

    const existing = await this.prisma.evaluationCriteria.findMany({
      where: { courseId },
    })

    const existingTotal = existing.reduce((acc, c) => acc + c.percentage, 0)
    const newTotal      = dto.criteria.reduce((acc, c) => acc + c.percentage, 0)

    if (existingTotal + newTotal > 100) {
      throw new ConflictException(
        `La suma de porcentajes excedería 100% (actual: ${existingTotal}%, nuevo: ${newTotal}%)`
      )
    }

    if (existing.length + dto.criteria.length > 5) {
      throw new BadRequestException('Un curso no puede tener más de 5 criterios de evaluación')
    }

    return this.prisma.evaluationCriteria.createMany({
      data: dto.criteria.map(c => ({ ...c, courseId })),
    })
  }

  async removeEvaluationCriteria(courseId: string, criteriaId: string) {
    const criteria = await this.prisma.evaluationCriteria.findFirst({
      where: { id: criteriaId, courseId },
    })
    if (!criteria) throw new NotFoundException('Criterio no encontrado en este curso')

    return this.prisma.evaluationCriteria.delete({ where: { id: criteriaId } })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IDIOMAS
  // ══════════════════════════════════════════════════════════════════════════

  async getLanguages() {
    return this.prisma.language.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async createLanguage(dto: CreateLanguageDto) {
    const exists = await this.prisma.language.findFirst({
      where: {
        OR: [
          { name: { equals: dto.name, mode: 'insensitive' } },
          { code: dto.code },
        ],
      },
    })
    if (exists) throw new ConflictException('Ya existe un idioma con ese nombre o código')

    return this.prisma.language.create({ data: dto })
  }

  async updateLanguage(id: string, data: { name?: string; isActive?: boolean }) {
    const language = await this.prisma.language.findUnique({ where: { id } })
    if (!language) throw new NotFoundException('Idioma no encontrado')

    return this.prisma.language.update({ where: { id }, data })
  }

  async deleteLanguage(id: string) {
    const courses = await this.prisma.course.count({ where: { languageId: id } })
    if (courses > 0) {
      throw new ConflictException(
        `No se puede eliminar: el idioma tiene ${courses} curso(s) asignado(s)`
      )
    }
    return this.prisma.language.delete({ where: { id } })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CICLOS ESCOLARES
  // ══════════════════════════════════════════════════════════════════════════

  async getCycles() {
    return this.prisma.schoolCycle.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { startDate: 'desc' },
    })
  }

  async getActiveCycle() {
    return this.prisma.schoolCycle.findFirst({
      where: { isActive: true },
    })
  }

  async createCycle(dto: CreateCycleDto) {
    const exists = await this.prisma.schoolCycle.findFirst({
      where: {
        OR: [{ name: dto.name }, { code: dto.code }],
      },
    })
    if (exists) throw new ConflictException('Ya existe un ciclo con ese nombre o código')

    return this.prisma.schoolCycle.create({
      data: {
        name:      dto.name,
        code:      dto.code,
        startDate: new Date(dto.startDate),
        endDate:   new Date(dto.endDate),
        isActive:  dto.isActive ?? false,
      },
    })
  }

  // Activar un ciclo desactiva automáticamente todos los demás
  async activateCycle(id: string) {
    const cycle = await this.prisma.schoolCycle.findUnique({ where: { id } })
    if (!cycle) throw new NotFoundException('Ciclo escolar no encontrado')

    await this.prisma.$transaction([
      this.prisma.schoolCycle.updateMany({
        where: { isActive: true },
        data:  { isActive: false },
      }),
      this.prisma.schoolCycle.update({
        where: { id },
        data:  { isActive: true },
      }),
    ])

    this.logger.log(`Ciclo activado: ${cycle.name}`)
    return this.prisma.schoolCycle.findUnique({ where: { id } })
  }
}