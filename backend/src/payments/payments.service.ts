// src/payments/payments.service.ts
import {
  Injectable, NotFoundException,
  BadRequestException, UnauthorizedException, Logger,
  HttpException, InternalServerErrorException
} from '@nestjs/common'
import { ConfigService }        from '@nestjs/config'
import { MercadoPagoConfig, Preference, Payment as MPPayment, PaymentRefund } from 'mercadopago'
import { PrismaService }        from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { EnrollmentsService }   from '../enrollments/enrollments.service'
import { PaymentStatus, PaymentType } from '@prisma/client'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  private readonly mpClient: MercadoPagoConfig
  private readonly frontendUrl: string

  constructor(
    private readonly prisma:        PrismaService,
    private readonly config:        ConfigService,
    private readonly notifications: NotificationsService,
    private readonly enrollments:   EnrollmentsService,
  ) {
    const accessToken  = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN', '')
    this.frontendUrl   = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173')
    
    // Inicializar SDK de MercadoPago
    this.mpClient = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CREAR PREFERENCE
  // ══════════════════════════════════════════════════════════════════════════

  async createPreference(enrollmentId: string, studentProfileId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: { include: { language: true } },
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    })

    if (!enrollment) throw new NotFoundException('Inscripción no encontrada')

    if (enrollment.studentId !== studentProfileId) {
      throw new BadRequestException('Esta inscripción no te pertenece')
    }

    if (enrollment.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `No se puede pagar una inscripción en estado ${enrollment.status}`,
      )
    }

    const course   = enrollment.course as any
    const language = course.language   as any
    const user     = enrollment.student.user as any
    const title    = `${language.name} ${course.level} — TESH`
    const rawPrice = course.price?.toString() || course.enrollmentFee?.toString() || '1500'
    let amount   = Number(rawPrice)
    if (isNaN(amount) || amount <= 0) amount = 1500

    // Check if we already have a pending Payment for this enrollment
    let payment = await this.prisma.payment.findFirst({
      where: { enrollmentId, status: PaymentStatus.PENDING },
    })

    let preferenceId: string
    let initPoint: string | undefined

    // Always create a fresh preference to ensure updated urls/data or prices
    const preferenceClient = new Preference(this.mpClient)
    
    const backendUrl = this.config.get('BACKEND_URL', 'http://localhost:3000') // En PROD debe ser el dominio público
    
    try {
      const result = await preferenceClient.create({
        body: {
          items: [
            {
              id: course.id,
              title: title,
              quantity: 1,
              unit_price: amount,
              currency_id: 'MXN',
            },
          ],
          payer: {
            email: 'test_user_1234@testuser.com', // Email genérico para evitar cruces con cuentas reales
          },
          back_urls: {
            success: `${this.frontendUrl}/pago/exitoso`,
            pending: `${this.frontendUrl}/pago/pendiente`,
            failure: `${this.frontendUrl}/pago/error`,
          },
          auto_return: 'approved',
          notification_url: `${backendUrl}/api/payments/webhook`,
          external_reference: enrollmentId,
        },
      })

      initPoint = result.init_point
      preferenceId = result.id!
      this.logger.debug(`Generated Preference ID: ${preferenceId} (Length: ${preferenceId.length})`)
    } catch (apiError: any) {
      this.logger.error('Error from MercadoPago API:', apiError)
      if (apiError.cause) this.logger.error('MP Error Cause:', apiError.cause)
      throw new InternalServerErrorException('Error al comunicarse con MercadoPago')
    }

    // Guardar en BD
    try {
      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            mpPreferenceId: preferenceId,
            mpExternalRef:  enrollmentId, 
            amount,
          }
        })
      } else {
        await this.prisma.payment.create({
          data: {
            studentId:             studentProfileId,
            enrollmentId,
            type:                  PaymentType.ENROLLMENT_FEE,
            mpPreferenceId:        preferenceId,
            mpExternalRef:         enrollmentId,
            amount,
            status:                PaymentStatus.PENDING,
            currency:              'MXN',
            description:           title,
          },
        })
      }
    } catch (dbError) {
      this.logger.error('Database Error when saving preference:', dbError)
      throw new InternalServerErrorException('Error local al guardar intención de pago')
    }

    this.logger.log(`MP Preference creada: ${preferenceId} → inscripción ${enrollmentId}`)
    return {
      preferenceId,
      initPoint,
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MANEJAR WEBHOOK (IPN MercadoPago)
  // ══════════════════════════════════════════════════════════════════════════

  async handleWebhook(body: any) {
    if (!body || !body.type || !body.data || !body.data.id) {
       return { ignored: true }
    }

    if (body.type === 'payment') {
      const paymentId = body.data.id
      const paymentClient = new MPPayment(this.mpClient)
      
      try {
        const mpPayment = await paymentClient.get({ id: paymentId })
        const enrollmentId = mpPayment.external_reference || mpPayment.metadata?.enrollmentId || null

        if (!enrollmentId) {
           this.logger.warn(`Pago de MP ${paymentId} sin external_reference`)
           return { ignored: true }
        }

        const isApproved = mpPayment.status === 'approved'

        // Get the payment record spanning the preference
        let paymentRecord = await this.prisma.payment.findFirst({
           where: { enrollmentId, status: PaymentStatus.PENDING },
           orderBy: { createdAt: 'desc' }
        })

        if (!paymentRecord) {
           // Podría estar aprobado ya, consultamos solo para loggear
           paymentRecord = await this.prisma.payment.findFirst({
             where: { enrollmentId },
             orderBy: { createdAt: 'desc' }
           })
           if (!paymentRecord) return { ignored: true }
        }

        let newStatus = paymentRecord.status
        if (isApproved) newStatus = PaymentStatus.APPROVED
        else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') newStatus = PaymentStatus.REJECTED

        // Actualizamos estado del pago de MP
        const updatedPayment = await this.prisma.payment.update({
           where: { id: paymentRecord.id },
           data: {
              status: newStatus,
              mpPaymentId: String(paymentId),
              mpStatus: mpPayment.status,
              mpStatusDetail: mpPayment.status_detail,
              webhookReceivedAt: new Date(),
           },
           include: {
              enrollment: { include: { student: { include: { user: true } }, course: { include: { language: true } } } }
           }
        })

        if (isApproved && updatedPayment.enrollment && updatedPayment.enrollment.status === 'PENDING_PAYMENT') {
           // Activar inscripción en sistema
           await this.enrollments.activate(enrollmentId)

           const user   = updatedPayment.enrollment.student.user as any
           const course = updatedPayment.enrollment.course       as any
           const name   = `${user.firstName} ${user.lastName}`
           const cName  = `${course.language.name} ${course.level}`
   
           await this.notifications.sendPaymentConfirmation(user.email, name, Number(updatedPayment.amount), cName)
           this.logger.log(`Pago aprobado (MercadoPago) e inscripción activada: ${enrollmentId}`)
        }

        return { status: newStatus }
      } catch (err) {
        this.logger.error(`Error verificando pago en MP: ${err.message}`)
        return { error: true }
      }
    }

    return { ignored: true }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONSULTAS
  // ══════════════════════════════════════════════════════════════════════════

  async findMyPayments(studentProfileId: string) {
    return this.prisma.payment.findMany({
      where:   { studentId: studentProfileId },
      include: {
        enrollment: { include: { course: { include: { language: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where:   { id },
      include: {
        enrollment: {
          include: {
            course:  { include: { language: true } },
            student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          },
        },
      },
    })
    if (!payment) throw new NotFoundException('Pago no encontrado')
    return payment
  }

  async findAll(filters?: { studentId?: string; status?: PaymentStatus }) {
    return this.prisma.payment.findMany({
      where: {
        ...(filters?.studentId && { studentId: filters.studentId }),
        ...(filters?.status    && { status:    filters.status }),
      },
      include: {
        enrollment: { include: { course: { include: { language: true } } } },
        student:    { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getStats() {
    const [approved, pending, rejected] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.APPROVED },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.PENDING },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.REJECTED },
      }),
    ])

    return {
      totalRevenue:  Number(approved._sum?.amount || 0),
      totalApproved: Number(approved._sum?.amount || 0),
      totalPending:  Number(pending._sum?.amount || 0),
      totalRejected: Number(rejected._sum?.amount || 0),
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REEMBOLSO
  // ══════════════════════════════════════════════════════════════════════════

  async processRefund(id: string, adminId: string) {
    const payment = await this.findOne(id)

    if (payment.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException('Solo se pueden reembolsar pagos aprobados')
    }
    if (!payment.mpPaymentId) {
      throw new BadRequestException('No se encontró el ID de pago en MercadoPago para solicitar reembolso')
    }

    const refundClient = new PaymentRefund(this.mpClient)
    await refundClient.create({ payment_id: payment.mpPaymentId })

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status:      PaymentStatus.REFUNDED,
        refundedAt:  new Date(),
      },
    })

    await this.prisma.auditLog.create({
      data: {
        userId:   adminId,
        action:   'PAYMENT_REFUNDED',
        entity:   'Payment',
        entityId: id,
        newValue: { mpPaymentId: payment.mpPaymentId },
      },
    })

    this.logger.log(`Reembolso MercadoPago procesado para pago ${id}`)
    return updated
  }
}
