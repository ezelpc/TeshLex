// src/payments/payments.controller.ts
import {
  Controller, Get, Post, Param, Body, Query, Headers,
  UseGuards, HttpCode, HttpStatus, Req, UnauthorizedException
} from '@nestjs/common'
import * as crypto from 'crypto'
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiQuery, ApiParam,
} from '@nestjs/swagger'
import { SkipThrottle }        from '@nestjs/throttler'
import { Role, PaymentStatus } from '@prisma/client'
import { PaymentsService }     from './payments.service'
import { CreatePreferenceDto } from './dto/create-preference.dto'
import { PaginationDto }       from '../common/dto/pagination.dto'
import { JwtAuthGuard }        from '../common/guards/jwt-auth.guard'
import { RolesGuard }          from '../common/guards/roles.guard'
import { Roles }               from '../common/decorators/roles.decorator'
import { CurrentUser }         from '../common/decorators/current-user.decorator'

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── POST /api/payments/create-preference — Alumno inicia el pago ─────────────
  @Post('create-preference')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({
    summary:     '[Alumno] Iniciar pago de inscripción',
    description: 'Genera una Preference en MercadoPago y retorna el init_point y preferenceId.',
  })
  createPreference(
    @CurrentUser() user: any,
    @Body() dto: CreatePreferenceDto,
  ) {
    return this.paymentsService.createPreference(dto.enrollmentId, user.studentProfileId)
  }

  // ── POST /api/payments/webhook — MP notifica cambios de estado ────────
  @Post('webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     '[MercadoPago] Webhook IPN (sin autenticación JWT)',
    description: 'Procesa notificaciones de pagos de MercadoPago.',
  })
  async webhook(
    @Body() body: any,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
    @Query('data.id') dataId: string,
  ) {
    if (!xSignature || !xRequestId || !dataId) {
      throw new UnauthorizedException('Request Headers incompletos para webhook')
    }

    // 1. Extraer timestamp(ts) y hash(v1)
    const { ts, v1: hash } = xSignature.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=')
      acc[k] = v
      return acc
    }, {} as Record<string, string>)

    if (!ts || !hash) throw new UnauthorizedException('Firma de webhook inválida')

    // 2. Hash HMAC-SHA256 Manifest
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts}`
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || ''
    const expectedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

    if (hash !== expectedHash) {
      throw new UnauthorizedException('Firma HMAC MercadoPago no superada')
    }

    return this.paymentsService.handleWebhook(body)
  }

  // ── GET /api/payments/stats — Admin métricas de ingresos ─────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: '[Admin] Obtener estadísticas de pagos' })
  getStats() {
    return this.paymentsService.getStats()
  }

  // ── GET /api/payments/my — Alumno consulta sus pagos ────────────────────
  @Get('my')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: '[Alumno] Mis pagos' })
  findMyPayments(@CurrentUser() user: any, @Query() paginationDto: PaginationDto) {
    return this.paymentsService.findMyPayments(user.studentProfileId, paginationDto)
  }

  // ── GET /api/payments — Admin lista todos los pagos ──────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: '[Admin] Listar todos los pagos con filtros opcionales' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'status', enum: PaymentStatus, required: false })
  findAll(
    @Query('studentId') studentId?: string,
    @Query('status')    status?: PaymentStatus,
  ) {
    return this.paymentsService.findAll({ studentId, status })
  }

  // ── GET /api/payments/:id — Detalle de un pago ──────────────────────────
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Detalle de un pago' })
  @ApiParam({ name: 'id', description: 'UUID del pago' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id)
  }

  // ── POST /api/payments/:id/refund — Admin procesa un reembolso ──────────
  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: '[Admin] Procesar reembolso de un pago aprobado' })
  @ApiParam({ name: 'id', description: 'UUID del pago' })
  processRefund(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.processRefund(id, user.id)
  }
}
