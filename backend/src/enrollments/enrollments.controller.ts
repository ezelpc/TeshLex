// src/enrollments/enrollments.controller.ts
import {
  Controller, Get, Post, Patch,
  Body, Param, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiQuery, ApiParam,
} from '@nestjs/swagger'
import { Role, EnrollmentStatus }   from '@prisma/client'
import { EnrollmentsService }       from './enrollments.service'
import { PreEnrollDto }             from './dto/pre-enroll.dto'
import { DropEnrollmentDto }        from './dto/drop.dto'
import { SaveGradesDto }            from './dto/save-grades.dto'
import { RecordAttendanceDto }      from './dto/record-attendance.dto'
import { JwtAuthGuard }             from '../common/guards/jwt-auth.guard'
import { RolesGuard }               from '../common/guards/roles.guard'
import { Roles }                    from '../common/decorators/roles.decorator'
import { CurrentUser }              from '../common/decorators/current-user.decorator'

@ApiTags('Enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-Auth')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  // ── GET /api/enrollments — Admin / Profesor ──────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.TEACHER)
  @ApiOperation({ summary: '[Admin/Profesor] Listar inscripciones con filtros' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'courseId',  required: false })
  @ApiQuery({ name: 'status', enum: EnrollmentStatus, required: false })
  findAll(
    @Query('studentId') studentId?: string,
    @Query('courseId')  courseId?:  string,
    @Query('status')    status?:    EnrollmentStatus,
  ) {
    return this.enrollmentsService.findAll({ studentId, courseId, status })
  }

  // ── GET /api/enrollments/my — Alumno ─────────────────────────────────────
  @Get('my')
  @SkipThrottle()
  @ApiOperation({ summary: '[Alumno] Mis inscripciones activas y pendientes' })
  getMyEnrollments(@CurrentUser() user: any) {
    return this.enrollmentsService.findAll({ studentId: user.studentProfileId })
  }

  // ── GET /api/enrollments/my/history — Alumno ─────────────────────────────
  @Get('my/history')
  @ApiOperation({ summary: '[Alumno] Historial académico completo' })
  getMyHistory(@CurrentUser() user: any) {
    return this.enrollmentsService.getStudentHistory(user.studentProfileId)
  }

  // ── GET /api/enrollments/:id ─────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de inscripción con calificaciones y asistencias' })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  findOne(@Param('id') id: string) {
    return this.enrollmentsService.findOne(id)
  }

  // ── GET /api/enrollments/:id/attendance — Resumen de asistencia ──────────
  @Get(':id/attendance')
  @ApiOperation({ summary: 'Resumen de asistencia de una inscripción' })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  getAttendanceSummary(@Param('id') id: string) {
    return this.enrollmentsService.getAttendanceSummary(id)
  }

  // ── POST /api/enrollments/pre-enroll — Alumno ────────────────────────────
  @Post('pre-enroll')
  @SkipThrottle()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:     '[Alumno] Pre-inscribirse a un curso',
    description: 'Crea la inscripción en estado PENDING_PAYMENT. El pago se realiza después.',
  })
  preEnroll(
    @CurrentUser() user: any,
    @Body() dto: PreEnrollDto,
  ) {
    return this.enrollmentsService.preEnroll(user.studentProfileId, dto.courseId)
  }

  // ── PATCH /api/enrollments/:id/drop — Admin ──────────────────────────────
  @Patch(':id/drop')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Dar de baja a un alumno' })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  drop(
    @Param('id') id: string,
    @Body() dto: DropEnrollmentDto,
    @CurrentUser() user: any,
  ) {
    return this.enrollmentsService.drop(id, dto.reason, user.id)
  }

  // ── PATCH /api/enrollments/:id/complete — Admin ──────────────────────────
  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Marcar inscripción como completada' })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  complete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.enrollmentsService.complete(id, user.id)
  }

  // ── POST /api/enrollments/:id/grades — Profesor ──────────────────────────
  @Post(':id/grades')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     '[Profesor] Registrar o actualizar calificaciones',
    description: 'Calcula automáticamente la calificación final ponderada. Si aprueba (≥7) genera boleta.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  saveGrades(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: SaveGradesDto,
  ) {
    return this.enrollmentsService.saveGrades(id, user.teacherProfileId, dto)
  }

  // ── POST /api/enrollments/:id/attendance — Profesor ──────────────────────
  @Post(':id/attendance')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Profesor] Registrar asistencia de un alumno' })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  recordAttendance(
    @Param('id') id: string,
    @Body() dto: RecordAttendanceDto,
  ) {
    return this.enrollmentsService.recordAttendance(id, dto.date, dto.present, dto.notes)
  }

  // ── POST /api/enrollments/bulk-attendance — Profesor ─────────────────────
  @Post('bulk-attendance')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     '[Profesor] Registrar asistencia de toda la clase en un día',
    description: 'Envía un arreglo con el estado de asistencia de todos los alumnos del curso.',
  })
  recordBulkAttendance(
    @Body() body: {
      courseId: string
      date:     string
      records:  { enrollmentId: string; present: boolean; notes?: string }[]
    },
  ) {
    return this.enrollmentsService.recordBulkAttendance(
      body.courseId,
      body.date,
      body.records,
    )
  }
}