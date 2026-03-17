// src/enrollments/enrollments.service.ts
import {
  Injectable, NotFoundException,
  ConflictException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common'
import { PrismaService }        from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { EnrollmentStatus }     from '@prisma/client'
import { SaveGradesDto }        from './dto/save-grades.dto'

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name)

  constructor(
    private readonly prisma:         PrismaService,
    private readonly notifications:  NotificationsService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // LISTAR
  // ══════════════════════════════════════════════════════════════════════════

  async findAll(filters?: {
    studentId?: string
    courseId?:  string
    status?:    EnrollmentStatus
  }) {
    return this.prisma.enrollment.findMany({
      where: {
        ...(filters?.studentId && { studentId: filters.studentId }),
        ...(filters?.courseId  && { courseId:  filters.courseId }),
        ...(filters?.status    && { status:    filters.status }),
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
        course: {
          include: { language: true },
        },
        grades:   true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        document: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where:   { id },
      include: {
        student: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        course: {
          include: {
            language:           true,
            evaluationCriteria: { orderBy: { order: 'asc' } },
            teacher: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
        grades:      true,
        attendances: { orderBy: { date: 'desc' } },
        payments:    { orderBy: { createdAt: 'desc' } },
        document:    true,
      },
    })

    if (!enrollment) throw new NotFoundException('Inscripción no encontrada')
    return enrollment
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRE-INSCRIPCIÓN — alumno se anota sin pagar aún
  // ══════════════════════════════════════════════════════════════════════════

  async preEnroll(studentProfileId: string, courseId: string) {
    // 1. Verificar que el curso existe y está activo
    const course = await this.prisma.course.findUnique({ where: { id: courseId } })
    if (!course) throw new NotFoundException('Curso no encontrado')

    if (course.status !== 'ACTIVE') {
      throw new BadRequestException('El curso no está disponible para inscripciones')
    }

    if (course.currentStudents >= course.maxStudents) {
      throw new ConflictException('El curso ya no tiene lugares disponibles')
    }

    // 2. Verificar que no tenga inscripción previa
    const existing = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: studentProfileId, courseId } },
    })
    if (existing) {
      throw new ConflictException('Ya tienes una inscripción en este curso')
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId:       studentProfileId,
        courseId,
        status:          EnrollmentStatus.PENDING_PAYMENT,
        isPreEnrollment: true,
        preEnrolledAt:   new Date(),
      },
      include: {
        course:  { include: { language: true } },
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    })

    this.logger.log(`Pre-inscripción: estudiante ${studentProfileId} → curso ${courseId}`)
    return enrollment
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVAR — se llama desde el webhook de Mercado Pago
  // ══════════════════════════════════════════════════════════════════════════

  async activate(enrollmentId: string) {
    const enrollment = await this.findOne(enrollmentId)

    if (enrollment.status !== EnrollmentStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `No se puede activar: estado actual es ${enrollment.status}`,
      )
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status:          EnrollmentStatus.ACTIVE,
          enrolledAt:      new Date(),
          isPreEnrollment: false,
        },
      }),
      this.prisma.course.update({
        where: { id: enrollment.courseId },
        data:  { currentStudents: { increment: 1 } },
      }),
      this.prisma.auditLog.create({
        data: {
          action:   'ENROLLMENT_ACTIVATED',
          entity:   'Enrollment',
          entityId: enrollmentId,
        },
      }),
    ])

    // Email de confirmación — no bloquea si falla
    const user    = enrollment.student.user as any
    const course  = enrollment.course as any
    const name    = `${user.firstName} ${user.lastName}`
    const cName   = `${course.language.name} ${course.level}`

    await this.notifications.sendEnrollmentConfirmation(user.email, name, cName)

    this.logger.log(`Inscripción activada: ${enrollmentId}`)
    return updated
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BAJA — admin da de baja al alumno
  // ══════════════════════════════════════════════════════════════════════════

  async drop(enrollmentId: string, reason: string, adminId: string) {
    const enrollment = await this.findOne(enrollmentId)

    if (([EnrollmentStatus.DROPPED, EnrollmentStatus.EXPELLED] as EnrollmentStatus[]).includes(enrollment.status)) {
      throw new BadRequestException('Esta inscripción ya fue dada de baja')
    }

    const wasActive = enrollment.status === EnrollmentStatus.ACTIVE

    const [updated] = await this.prisma.$transaction([
      this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status:     EnrollmentStatus.DROPPED,
          droppedAt:  new Date(),
          dropReason: reason,
        },
      }),
      // Solo decrementar si estaba activo
      ...(wasActive ? [this.prisma.course.update({
        where: { id: enrollment.courseId },
        data:  { currentStudents: { decrement: 1 } },
      })] : []),
      this.prisma.auditLog.create({
        data: {
          userId:   adminId,
          action:   'ENROLLMENT_DROPPED',
          entity:   'Enrollment',
          entityId: enrollmentId,
          newValue: { reason },
        },
      }),
    ])

    // Notificar al alumno
    const user   = enrollment.student.user as any
    const course = enrollment.course as any
    await this.notifications.sendDropNotification(
      user.email,
      `${user.firstName} ${user.lastName}`,
      `${course.language.name} ${course.level}`,
      reason,
    )

    this.logger.log(`Baja: ${enrollmentId} — ${reason}`)
    return updated
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLETAR — admin marca el curso como terminado
  // ══════════════════════════════════════════════════════════════════════════

  async complete(enrollmentId: string, adminId: string) {
    const enrollment = await this.findOne(enrollmentId)

    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Solo se pueden completar inscripciones activas')
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status:      EnrollmentStatus.COMPLETED,
          completedAt: new Date(),
        },
      }),
      this.prisma.course.update({
        where: { id: enrollment.courseId },
        data:  { currentStudents: { decrement: 1 } },
      }),
      this.prisma.auditLog.create({
        data: {
          userId:   adminId,
          action:   'ENROLLMENT_COMPLETED',
          entity:   'Enrollment',
          entityId: enrollmentId,
        },
      }),
    ])

    return updated
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CALIFICACIONES — profesor registra o actualiza
  // ══════════════════════════════════════════════════════════════════════════

  async saveGrades(
    enrollmentId:     string,
    teacherProfileId: string,
    dto:              SaveGradesDto,
  ) {
    const enrollment = await this.findOne(enrollmentId)

    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Solo se pueden calificar inscripciones activas')
    }

    // Calcular calificación final ponderada
    const finalGrade = dto.criteriaGrades.reduce(
      (acc, cg) => acc + (cg.score * cg.weight) / 100,
      0,
    )
    const passed = finalGrade >= 7

    const grade = await this.prisma.grade.upsert({
      where:  { enrollmentId },
      update: {
        criteriaGrades: dto.criteriaGrades as any,
        finalGrade,
        passed,
        observations: dto.observations,
        gradedAt:     new Date(),
      },
      create: {
        enrollmentId,
        teacherId:     teacherProfileId,
        criteriaGrades: dto.criteriaGrades as any,
        finalGrade,
        passed,
        observations: dto.observations,
      },
    })

    // Si aprobó → crear boleta pendiente de liberación
    if (passed) {
      await this.prisma.document.upsert({
        where:  { enrollmentId },
        update: {},
        create: {
          studentId:    enrollment.studentId,
          enrollmentId,
          type:         'BOLETA',
          status:       'PENDING',
        },
      })
    }

    await this.prisma.auditLog.create({
      data: {
        userId:   (enrollment.course as any).teacherId,
        action:   'GRADES_SAVED',
        entity:   'Grade',
        entityId: enrollmentId,
        newValue: { finalGrade, passed },
      },
    })

    return grade
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ASISTENCIA — profesor registra por clase
  // ══════════════════════════════════════════════════════════════════════════

  async recordAttendance(
    enrollmentId: string,
    date:         string,
    present:      boolean,
    notes?:       string,
  ) {
    // Verificar que la inscripción existe
    await this.findOne(enrollmentId)

    const attendanceDate = new Date(date)

    return this.prisma.attendance.upsert({
      where:  { enrollmentId_date: { enrollmentId, date: attendanceDate } },
      update: { present, notes },
      create: { enrollmentId, date: attendanceDate, present, notes },
    })
  }

  // Registrar asistencia en bloque (toda la clase de un día)
  async recordBulkAttendance(
    courseId: string,
    date:     string,
    records:  { enrollmentId: string; present: boolean; notes?: string }[],
  ) {
    const attendanceDate = new Date(date)

    const results = await Promise.all(
      records.map(r =>
        this.prisma.attendance.upsert({
          where:  { enrollmentId_date: { enrollmentId: r.enrollmentId, date: attendanceDate } },
          update: { present: r.present, notes: r.notes },
          create: { enrollmentId: r.enrollmentId, date: attendanceDate, present: r.present, notes: r.notes },
        }),
      ),
    )

    return { saved: results.length, date, courseId }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORIAL — alumno consulta su historial académico
  // ══════════════════════════════════════════════════════════════════════════

  async getStudentHistory(studentProfileId: string) {
    return this.prisma.enrollment.findMany({
      where:   { studentId: studentProfileId },
      include: {
        course: {
          include: { language: true },
        },
        grades:   true,
        document: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  // Resumen de asistencia de una inscripción
  async getAttendanceSummary(enrollmentId: string) {
    await this.findOne(enrollmentId)

    const attendances = await this.prisma.attendance.findMany({
      where:   { enrollmentId },
      orderBy: { date: 'asc' },
    })

    const total    = attendances.length
    const present  = attendances.filter(a => a.present).length
    const absent   = total - present
    const percent  = total > 0 ? Math.round((present / total) * 100) : 0

    return { total, present, absent, percent, records: attendances }
  }
}