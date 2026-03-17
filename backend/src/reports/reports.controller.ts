// src/reports/reports.controller.ts
import {
  Controller, Get, Patch, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiParam, ApiQuery,
} from '@nestjs/swagger'
import { Role }           from '@prisma/client'
import { ReportsService } from './reports.service'
import { JwtAuthGuard }   from '../common/guards/jwt-auth.guard'
import { RolesGuard }     from '../common/guards/roles.guard'
import { Roles }          from '../common/decorators/roles.decorator'
import { CurrentUser }    from '../common/decorators/current-user.decorator'

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
@ApiBearerAuth('JWT-Auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ── GET /api/reports/dashboard ────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: '[Admin] KPIs generales del sistema' })
  getDashboard() {
    return this.reportsService.getDashboard()
  }

  // ── GET /api/reports/documents/pending ────────────────────────────────────
  @Get('documents/pending')
  @ApiOperation({ summary: '[Admin] Documentos pendientes de liberar' })
  getPendingDocuments() {
    return this.reportsService.getPendingDocuments()
  }

  // ── PATCH /api/reports/documents/:id/release ──────────────────────────────
  @Patch('documents/:id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Liberar boleta o certificado al alumno' })
  @ApiParam({ name: 'id', description: 'UUID del documento' })
  releaseDocument(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.releaseDocument(id, user.id)
  }

  // ── GET /api/reports/comments ─────────────────────────────────────────────
  @Get('comments')
  @ApiOperation({ summary: '[Admin] Comentarios de profesores no leídos' })
  getUnreadComments() {
    return this.reportsService.getUnreadComments()
  }

  // ── PATCH /api/reports/comments/:id/read ─────────────────────────────────
  @Patch('comments/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Marcar comentario como leído' })
  @ApiParam({ name: 'id', description: 'UUID del comentario' })
  markCommentRead(@Param('id') id: string) {
    return this.reportsService.markCommentRead(id)
  }

  // ── GET /api/reports/payments/summary ────────────────────────────────────
  @Get('payments/summary')
  @ApiOperation({
    summary:     '[Admin] Resumen de ingresos por período',
    description: 'Muestra el total de pagos aprobados agrupados por mes. Parámetros opcionales: from/to (ISO 8601).',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Fecha inicio (ISO 8601)' })
  @ApiQuery({ name: 'to',   required: false, description: 'Fecha fin (ISO 8601)' })
  getPaymentsSummary(
    @Query('from') from?: string,
    @Query('to')   to?:   string,
  ) {
    return this.reportsService.getPaymentsSummary(from, to)
  }
}
