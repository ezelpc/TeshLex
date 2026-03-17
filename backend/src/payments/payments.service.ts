// src/payments/payments.service.ts
import {
  Injectable, NotFoundException,
  BadRequestException, UnauthorizedException, Logger,
} from '@nestjs/common'
import { ConfigService }       from '@nestjs/config'
import * as crypto             from 'crypto'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { PrismaService }       from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { EnrollmentsService }  from '../enrollments/enrollments.service'
import { PaymentStatus }       from '@prisma/client'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  private readonly mpClient:    MercadoPagoConfig
  private readonly preference:  Preference
  private readonly mpPayment:   Payment
  private readonly webhookSecret: string
  private readonly backendUrl:    string
  private readonly frontendUrl:   string

  constructor(
    private readonly prisma:         PrismaService,
    private readonly config:         ConfigService,
    private readonly notifications:  NotificationsService,
    private readonly enrollments:    EnrollmentsService,
  ) {
    this.mpClient = new MercadoPagoConfig({
      accessToken: this.config.get<string>('MP_ACCESS_TOKEN', ''),
      options: {
        sandbox: this.config.get<string>('MP_SANDBOX', 'true') === 'true',
      },
    })
    this.preference   = new Preference(this.mpClient)
    this.mpPayment    = new Payment(this.mpClient)
    this.webhookSecret = this.config.get<string>('MP_WEBHOOK_SECRET', '')
    this.backendUrl    = this.config.get<string>('BACKEND_URL',    'http://localhost:3000')
    this.frontendUrl   = this.config.get<string>('FRONTEND_URL',   'http://localhost:5173')
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VERIFICAR FIRMA HMAC (webhook de Mercado Pago)
  // ══════════════════════════════════════════════════════════════════════════

  verifyHmacSignature(rawBody: Buffer, signature: string): void {
    if (!this.webhookSecret) return // en desarrollo sin secreto configurado
    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex')
    if (hash !== signature) {
      throw new UnauthorizedException('Firma de webhook inválida')
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CREAR PREFERENCIA — alumno inicia el pago
  // ══════════════════════════════════════════════════════════════════════════

  async createPreference(studentProfileId: string, enrollmentId: string) {
    // 1. Obtener inscripción con curso e idioma
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

    const course      = enrollment.course as any
    const language    = course.language as any
    const user        = enrollment.student.user as any
    const title       = `${language.name} ${course.level} — TESH`
    const amount      = Number(course.price)

    // 2. Crear preferencia en Mercado Pago
    const mpResponse = await this.preference.create({
      body: {
        items: [
          {
            id:          enrollmentId,
            title,
            quantity:    1,
            unit_price:  amount,
            currency_id: 'MXN',
          },
        ],
        payer: {
          email: user.email,
          name:  user.firstName,
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

    // 3. Guardar/actualizar registro Payment en BD
    await this.prisma.payment.upsert({
      where:  { enrollmentId },
      update: {
        mpPreferenceId: mpResponse.id ?? null,
        checkoutUrl:    mpResponse.init_point ?? null,
        amount,
        status:         PaymentStatus.PENDING,
      },
      create: {
        enrollmentId,
        studentId:      studentProfileId,
        mpPreferenceId: mpResponse.id ?? null,
        checkoutUrl:    mpResponse.init_point ?? null,
        amount,
        status:         PaymentStatus.PENDING,
        currency:       'MXN',
      },
    })

    this.logger.log(`Preferencia MP creada: ${mpResponse.id} para inscripción ${enrollmentId}`)
    return {
      preferenceId: mpResponse.id,
      checkoutUrl:  mpResponse.init_point,
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MANEJAR WEBHOOK — Mercado Pago notifica el resultado del pago
  // ══════════════════════════════════════════════════════════════════════════

  async handleWebhook(mpPaymentId: string) {
    // 1. Consultar pago en la API de Mercado Pago
    const mpPaymentData = await this.mpPayment.get({ id: mpPaymentId })

    const enrollmentId  = mpPaymentData.external_reference
    const mpStatus      = mpPaymentData.status?.toString().toUpperCase() ?? 'UNKNOWN'
    const amount        = mpPaymentData.transaction_amount ?? 0

    if (!enrollmentId) {
      this.logger.warn(`Webhook MP sin external_reference para pago ${mpPaymentId}`)
      return { ignored: true }
    }

    // 2. Mapear estado MP → PaymentStatus
    let paymentStatus: PaymentStatus
    switch (mpStatus) {
      case 'APPROVED':  paymentStatus = PaymentStatus.APPROVED;  break
      case 'REJECTED':  paymentStatus = PaymentStatus.REJECTED;  break
      case 'REFUNDED':  paymentStatus = PaymentStatus.REFUNDED;  break
      case 'CANCELLED': paymentStatus = PaymentStatus.CANCELLED; break
      default:          paymentStatus = PaymentStatus.PENDING
    }

    // 3. Actualizar Payment en BD
    const payment = await this.prisma.payment.update({
      where:   { enrollmentId },
      data: {
        mpPaymentId:  mpPaymentId,
        status:       paymentStatus,
        paidAt:       paymentStatus === PaymentStatus.APPROVED ? new Date() : undefined,
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

    // 4. Si APROBADO → activar inscripción + enviar email
    if (paymentStatus === PaymentStatus.APPROVED) {
      await this.enrollments.activate(enrollmentId)

      const user    = payment.enrollment.student.user as any
      const course  = payment.enrollment.course as any
      const name    = `${user.firstName} ${user.lastName}`
      const cName   = `${(course.language as any).name} ${course.level}`

      await this.notifications.sendPaymentConfirmation(
        user.email, name, amount, cName,
      )

      this.logger.log(`Pago aprobado y inscripción activada: ${enrollmentId}`)
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
        enrollment: {
          include: { course: { include: { language: true } } },
        },
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
        enrollment: {
          include: { course: { include: { language: true } } },
        },
        student: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
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

    // Solicitar reembolso en MP
    await this.mpPayment.refund({ id: payment.mpPaymentId })

    // Actualizar estado en BD
    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status:     PaymentStatus.REFUNDED,
        refundedAt: new Date(),
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

    this.logger.log(`Reembolso procesado para pago ${id} por admin ${adminId}`)
    return updated
  }
}
