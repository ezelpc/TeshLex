// src/reports/reports.service.ts
import {
  Injectable, NotFoundException, Logger,
} from '@nestjs/common'
import { PrismaService }        from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { DocumentStatus }       from '@prisma/client'

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(
    private readonly prisma:        PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD — KPIs generales
  // ══════════════════════════════════════════════════════════════════════════

  async getDashboard() {
    const now              = new Date()
    const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [
      totalStudents,
      totalTeachers,
      activeEnrollments,
      dropsThisMonth,
      pendingDocuments,
      revenueThisMonthData,
      revenueLastMonthData,
      coursesByLangAndLevel,
    ] = await Promise.all([
      this.prisma.studentProfile.count(),
      this.prisma.teacherProfile.count(),
      this.prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.enrollment.count({
        where: { status: 'DROPPED', droppedAt: { gte: startOfMonth } },
      }),
      this.prisma.document.count({ where: { status: 'PENDING' } }),
      // Ingresos mes actual — usando createdAt ya que Payment no tiene paidAt
      this.prisma.payment.aggregate({
        _sum:  { amount: true },
        where: { status: 'APPROVED', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.payment.aggregate({
        _sum:  { amount: true },
        where: {
          status:    'APPROVED',
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      // Cursos con inscripciones activas para agrupar por nivel e idioma
      this.prisma.course.findMany({
        where:  { enrollments: { some: { status: 'ACTIVE' } } },
        select: {
          level:    true,
          language: { select: { name: true } },
          _count:   { select: { enrollments: true } },
        },
      }),
    ])

    // Agrupar por nivel
    const levelMap = new Map<string, number>()
    const langMap  = new Map<string, number>()
    for (const course of coursesByLangAndLevel) {
      const lvl  = String(course.level)
      const lang = (course.language as any)?.name ?? 'Desconocido'
      const cnt  = course._count.enrollments
      levelMap.set(lvl,  (levelMap.get(lvl)  ?? 0) + cnt)
      langMap.set(lang,  (langMap.get(lang)   ?? 0) + cnt)
    }

    return {
      totalStudents,
      totalTeachers,
      activeEnrollments,
      dropsThisMonth,
      pendingDocuments,
      revenueThisMonth:      Number(revenueThisMonthData._sum?.amount ?? 0),
      revenueLastMonth:      Number(revenueLastMonthData._sum?.amount ?? 0),
      enrollmentsByLevel:    Array.from(levelMap.entries()).map(([level,    count]) => ({ level,    count })),
      enrollmentsByLanguage: Array.from(langMap.entries()) .map(([language, count]) => ({ language, count })),
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENTOS
  // ══════════════════════════════════════════════════════════════════════════

  async getPendingDocuments() {
    return this.prisma.document.findMany({
      where:   { status: 'PENDING' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        enrollment: {
          include: { course: { include: { language: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async releaseDocument(id: string, adminId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        enrollment: {
          include: { course: { include: { language: true } } },
        },
      },
    })

    if (!doc) throw new NotFoundException('Documento no encontrado')

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        status:       DocumentStatus.RELEASED,
        releasedAt:   new Date(),
        releasedById: adminId,
      },
    })

    const user   = doc.student.user as any
    const course = doc.enrollment?.course as any
    const cName  = course ? `${(course.language as any).name} ${course.level}` : 'tu curso'

    await this.notifications.saveInSystem(
      doc.studentId,
      `Tu ${doc.type} está disponible`,
      `Tu ${doc.type} del curso ${cName} ha sido liberada. Puedes descargarla desde el sistema.`,
      'Document',
      id,
    )

    this.logger.log(`Documento ${id} (${doc.type}) liberado por admin ${adminId}`)
    return updated
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMENTARIOS DE PROFESORES
  // Note: TeacherComment no tiene relación con Course en el schema
  // ══════════════════════════════════════════════════════════════════════════

  async getUnreadComments() {
    return this.prisma.teacherComment.findMany({
      where:   { isRead: false },
      include: {
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async markCommentRead(id: string) {
    const comment = await this.prisma.teacherComment.findUnique({ where: { id } })
    if (!comment) throw new NotFoundException('Comentario no encontrado')

    return this.prisma.teacherComment.update({
      where: { id },
      data:  { isRead: true, readAt: new Date() },
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMEN DE INGRESOS — agrupado por mes
  // Note: Payment usa createdAt, no paidAt
  // ══════════════════════════════════════════════════════════════════════════

  async getPaymentsSummary(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
    const toDate   = to   ? new Date(to)   : new Date()

    const payments = await this.prisma.payment.findMany({
      where: {
        status:    'APPROVED',
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: {
        amount:    true,
        currency:  true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const byMonth = new Map<string, number>()
    for (const p of payments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(p.amount))
    }

    const total = payments.reduce((acc, p) => acc + Number(p.amount), 0)

    return {
      from:    fromDate.toISOString(),
      to:      toDate.toISOString(),
      total,
      count:   payments.length,
      byMonth: Array.from(byMonth.entries()).map(([month, amount]) => ({ month, amount })),
    }
  }
}
