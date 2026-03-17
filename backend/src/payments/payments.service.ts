// src/payments/payments.service.ts
import {
  Injectable, NotFoundException,
  BadRequestException, UnauthorizedException, Logger,
} from '@nestjs/common'
import { ConfigService }        from '@nestjs/config'
import * as crypto              from 'crypto'
import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago'
import { PrismaService }        from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { EnrollmentsService }   from '../enrollments/enrollments.service'
import { PaymentStatus, PaymentType } from '@prisma/client'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  private readonly mpClient:       MercadoPagoConfig
  private readonly preference:     Preference
  private readonly mpPayment:      Payment
  private readonly mpRefund:       PaymentRefund
  private readonly webhookSecret:  string
  private readonly backendUrl:     string
  private readonly frontendUrl:    string

  constructor(
    private readonly prisma:        PrismaService,
    private readonly config:        ConfigService,
    private readonly notifications: NotificationsService,
    private readonly enrollments:   EnrollmentsService,
  ) {
    this.mpClient = new MercadoPagoConfig({
      accessToken: this.config.get<string>('MP_ACCESS_TOKEN', ''),
      options: {
        // testToken: true enables sandbox mode in mercadopago SDK v2
        testToken: this.config.get<string>('MP_SANDBOX', 'true') === 'true',
      },
    })
    this.preference    = new Preference(this.mpClient)
    this.mpPayment     = new Payment(this.mpClient)
    this.mpRefund      = new PaymentRefund(this.mpClient)
    this.webhookSecret = this.config.get<string>('MP_WEBHOOK_SECRET', '')
    this.backendUrl    = this.config.get<string>('BACKEND_URL',    'http://localhost:3000')
    this.frontendUrl   = this.config.get<string>('FRONTEND_URL',   'http://localhost:5173')
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VERIFICAR FIRMA HMAC
  // ══════════════════════════════════════════════════════════════════════════

  verifyHmacSignature(rawBody: Buffer, signature: string): void {
    if (!this.webhookSecret) return // sin secreto en dev → ignorar
    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex')
    if (hash !== signature) {
      throw new UnauthorizedException('Firma de webhook inválida')
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CREAR PREFERENCIA
  // ══════════════════════════════════════════════════════════════════════════

  async createPreference(studentProfileId: string, enrollmentId: string) {
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
    const amount   = Number(course.enrollmentFee)

    // Crear preferencia en Mercado Pago
    const mpResponse = await this.preference.create({
      body: {
        items: [{
          id:          enrollmentId,
          title,
          quantity:    1,
          unit_price:  amount,
          currency_id: 'MXN',
        }],
        payer: {
          email:   user.email,
          name:    user.firstName,
          surname: user.lastName,
        },
        back_urls: {
          success: `${this.frontendUrl}/pago/confirmado`,
          failure: `${this.frontendUrl}/pago/fallido`,
          pending: `${this.frontendUrl}/pago/pendiente`,
        },
        auto_return:          'approved',
        notification_url:     `${this.backendUrl}/api/payments/webhook`,
        external_reference:   enrollmentId,
        statement_descriptor: 'TESH Cursos',
      },
    })

    const preferenceId = mpResponse.id ?? null
    const checkoutUrl  = mpResponse.init_point ?? null

    // Guardar Payment en BD — usar create con upsert por mpExternalRef
    await this.prisma.payment.upsert({
      where:  { mpExternalRef: enrollmentId },
      update: {
        mpPreferenceId: preferenceId,
        receiptUrl:     checkoutUrl,
        amount,
        status:         PaymentStatus.PENDING,
        mpStatus:       'pending',
      },
      create: {
        studentId:      studentProfileId,
        enrollmentId,
        type:           PaymentType.ENROLLMENT_FEE,
        mpPreferenceId: preferenceId,
        mpExternalRef:  enrollmentId,
        receiptUrl:     checkoutUrl,
        amount,
        status:         PaymentStatus.PENDING,
        currency:       'MXN',
        description:    title,
        mpStatus:       'pending',
      },
    })

    this.logger.log(`Preferencia MP creada: ${preferenceId} → inscripción ${enrollmentId}`)
    return { preferenceId, checkoutUrl }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MANEJAR WEBHOOK
  // ══════════════════════════════════════════════════════════════════════════

  async handleWebhook(mpPaymentId: string) {
    const mpData       = await this.mpPayment.get({ id: mpPaymentId })
    const enrollmentId = mpData.external_reference
    const mpStatus     = (mpData.status ?? '').toUpperCase()
    const amount       = mpData.transaction_amount ?? 0

    if (!enrollmentId) {
      this.logger.warn(`Webhook MP sin external_reference — pago ${mpPaymentId}`)
      return { ignored: true }
    }

    // Mapear estado de MP a PaymentStatus
    let paymentStatus: PaymentStatus
    switch (mpStatus) {
      case 'APPROVED':  paymentStatus = PaymentStatus.APPROVED;  break
      case 'REJECTED':  paymentStatus = PaymentStatus.REJECTED;  break
      case 'REFUNDED':  paymentStatus = PaymentStatus.REFUNDED;  break
      case 'CANCELLED': paymentStatus = PaymentStatus.CANCELLED; break
      default:          paymentStatus = PaymentStatus.PENDING
    }

    // Actualizar Payment
    const payment = await this.prisma.payment.update({
      where: { mpExternalRef: enrollmentId },
      data: {
        mpPaymentId:       mpPaymentId,
        mpStatus:          mpData.status ?? null,
        mpStatusDetail:    mpData.status_detail ?? null,
        mpPaymentMethod:   (mpData as any).payment_method_id ?? null,
        status:            paymentStatus,
        webhookReceivedAt: new Date(),
      },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
            course: { include: { language: true } },
          },
        },
      },
    })

    // Si APROBADO → activar inscripción y notificar
    if (paymentStatus === PaymentStatus.APPROVED && payment.enrollment) {
      await this.enrollments.activate(enrollmentId)

      const user   = payment.enrollment.student.user  as any
      const course = payment.enrollment.course        as any
      const name   = `${user.firstName} ${user.lastName}`
      const cName  = `${(course.language as any).name} ${course.level}`

      await this.notifications.sendPaymentConfirmation(user.email, name, amount, cName)
      this.logger.log(`Pago aprobado e inscripción activada: ${enrollmentId}`)
    }

    return { status: paymentStatus, enrollmentId }
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

  // ══════════════════════════════════════════════════════════════════════════
  // REEMBOLSO
  // ══════════════════════════════════════════════════════════════════════════

  async processRefund(id: string, adminId: string) {
    const payment = await this.findOne(id)

    if (payment.status !== PaymentStatus.APPROVED) {
      throw new BadRequestException('Solo se pueden reembolsar pagos aprobados')
    }
    if (!payment.mpPaymentId) {
      throw new BadRequestException('No se encontró el ID de pago en Mercado Pago')
    }

    await this.mpRefund.total({ payment_id: payment.mpPaymentId })

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status:      PaymentStatus.REFUNDED,
        refundedAt:  new Date(),
        mpStatus:    'refunded',
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

    this.logger.log(`Reembolso procesado para pago ${id}`)
    return updated
  }
}
