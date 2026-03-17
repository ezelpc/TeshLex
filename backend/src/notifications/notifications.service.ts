// src/notifications/notifications.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService }      from '@nestjs/config'
import { PrismaService }      from '../prisma/prisma.service'
import { Resend }             from 'resend'

@Injectable()
export class NotificationsService {
  private readonly logger    = new Logger(NotificationsService.name)
  private readonly resend:     Resend
  private readonly fromEmail:  string
  private readonly fromName:   string
  private readonly frontendUrl: string

  constructor(
    private readonly prisma:  PrismaService,
    private readonly config:  ConfigService,
  ) {
    this.resend      = new Resend(this.config.get('RESEND_API_KEY'))
    this.fromEmail   = this.config.get('EMAIL_FROM',      'noreply@tesh.edu.mx')
    this.fromName    = this.config.get('EMAIL_FROM_NAME', 'TESH — Cursos de Idiomas')
    this.frontendUrl = this.config.get('FRONTEND_URL',    'http://localhost:5173')
  }

  // ── Inscripción confirmada ────────────────────────────────────────────────
  async sendEnrollmentConfirmation(
    email:       string,
    studentName: string,
    courseName:  string,
  ) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#166534;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="margin:0;font-size:22px">TESH — Cursos de Idiomas</h1>
        </div>
        <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
          <h2 style="color:#166534">¡Inscripción Confirmada!</h2>
          <p>Hola <strong>${studentName}</strong>,</p>
          <p>Tu inscripción al curso de <strong>${courseName}</strong> fue confirmada exitosamente.</p>
          <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#166534"><strong>Próximos pasos:</strong></p>
            <ul style="color:#166534;margin:8px 0">
              <li>Revisa tu horario en el sistema</li>
              <li>Prepara tus materiales para la primera clase</li>
              <li>Si tienes dudas, contacta a tu profesor</li>
            </ul>
          </div>
          <a href="${this.frontendUrl}/dashboard-alumno"
             style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
            Ir a mi Dashboard
          </a>
        </div>
      </div>`

    return this.send(email, `✅ Inscripción confirmada — ${courseName}`, html)
  }

  // ── Baja procesada ────────────────────────────────────────────────────────
  async sendDropNotification(
    email:       string,
    studentName: string,
    courseName:  string,
    reason:      string,
  ) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <p>Hola <strong>${studentName}</strong>,</p>
        <p>Te informamos que fuiste dado de baja del curso <strong>${courseName}</strong>.</p>
        <p><strong>Motivo:</strong> ${reason}</p>
        <p>Si crees que es un error, comunícate con administración a
           <a href="mailto:lenguas@tesh.edu.mx">lenguas@tesh.edu.mx</a>.</p>
      </div>`

    return this.send(email, `Notificación de baja — ${courseName}`, html)
  }

  // ── Pago confirmado ───────────────────────────────────────────────────────
  async sendPaymentConfirmation(
    email:       string,
    studentName: string,
    amount:      number,
    courseName:  string,
  ) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <p>Hola <strong>${studentName}</strong>,</p>
        <p>Recibimos tu pago de <strong>$${amount.toLocaleString('es-MX')} MXN</strong>
           por la inscripción a <strong>${courseName}</strong>.</p>
        <p>Tu inscripción será activada en breve.</p>
      </div>`

    return this.send(email, `💳 Pago recibido — $${amount.toLocaleString('es-MX')} MXN`, html)
  }

  // ── Guardar notificación en BD + enviar email ─────────────────────────────
  async saveInSystem(
    userId:  string,
    subject: string,
    body:    string,
    entityType?: string,
    entityId?:   string,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        channel:    'SYSTEM',
        subject,
        body,
        entityType,
        entityId,
      },
    })
  }

  // ── Helper privado ────────────────────────────────────────────────────────
  private async send(to: string, subject: string, html: string) {
    try {
      const result = await this.resend.emails.send({
        from:    `${this.fromName} <${this.fromEmail}>`,
        to,
        subject,
        html,
      })
      this.logger.log(`📧 Email enviado a ${to}: ${subject}`)
      return result
    } catch (error: any) {
      // No lanzar excepción — el email falla silenciosamente para no interrumpir el flujo
      this.logger.error(`Error enviando email a ${to}: ${error.message}`)
      return null
    }
  }
}