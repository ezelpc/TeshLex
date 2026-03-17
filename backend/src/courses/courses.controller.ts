// src/courses/courses.controller.ts
import {
  Controller, Get, Post, Patch, Put, Delete,
  Body, Param, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common'
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiQuery, ApiParam,
} from '@nestjs/swagger'
import { Role, LanguageLevel, CourseModality, CourseStatus } from '@prisma/client'
import { CoursesService }           from './courses.service'
import { CreateCourseDto }          from './dto/create-course.dto'
import { UpdateCourseDto }          from './dto/update-course.dto'
import { CreateLanguageDto }        from './dto/create-language.dto'
import { CreateCycleDto }           from './dto/create-cycle.dto'
import { AddEvaluationCriteriaDto } from './dto/evaluation-criteria.dto'
import { JwtAuthGuard }             from '../common/guards/jwt-auth.guard'
import { RolesGuard }               from '../common/guards/roles.guard'
import { Roles }                    from '../common/decorators/roles.decorator'

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ════════════════════════════════════════════════════════════════════════
  // CURSOS
  // ════════════════════════════════════════════════════════════════════════

  // GET /api/courses — PÚBLICO (landing, registro)
  @Get()
  @ApiOperation({ summary: 'Listar cursos con filtros opcionales (público)' })
  @ApiQuery({ name: 'languageId', required: false })
  @ApiQuery({ name: 'level',      enum: LanguageLevel,   required: false })
  @ApiQuery({ name: 'modality',   enum: CourseModality,  required: false })
  @ApiQuery({ name: 'status',     enum: CourseStatus,    required: false })
  @ApiQuery({ name: 'teacherId',  required: false })
  @ApiQuery({ name: 'cycleId',    required: false })
  findAll(
    @Query('languageId') languageId?: string,
    @Query('level')      level?:      LanguageLevel,
    @Query('modality')   modality?:   CourseModality,
    @Query('status')     status?:     CourseStatus,
    @Query('teacherId')  teacherId?:  string,
    @Query('cycleId')    cycleId?:    string,
  ) {
    return this.coursesService.findAll({ languageId, level, modality, status, teacherId, cycleId })
  }

  // GET /api/courses/:id — PÚBLICO
  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle completo de un curso (público)' })
  @ApiParam({ name: 'id', description: 'UUID del curso' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id)
  }

  // POST /api/courses — Admin
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Crear nuevo curso' })
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto)
  }

  // PATCH /api/courses/:id — Admin
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: '[Admin] Actualizar curso (campos parciales)' })
  @ApiParam({ name: 'id', description: 'UUID del curso' })
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto)
  }

  // POST /api/courses/:id/duplicate — Admin
  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Duplicar curso para nuevo ciclo escolar' })
  @ApiParam({ name: 'id', description: 'UUID del curso a duplicar' })
  duplicate(
    @Param('id') id: string,
    @Body() body: { cycleId?: string },
  ) {
    return this.coursesService.duplicate(id, body.cycleId)
  }

  // ════════════════════════════════════════════════════════════════════════
  // CRITERIOS DE EVALUACIÓN
  // ════════════════════════════════════════════════════════════════════════

  // POST /api/courses/:id/criteria — Admin / Profesor
  @Post(':id/criteria')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.TEACHER)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin/Profesor] Agregar criterios de evaluación a un curso' })
  @ApiParam({ name: 'id', description: 'UUID del curso' })
  addCriteria(@Param('id') id: string, @Body() dto: AddEvaluationCriteriaDto) {
    return this.coursesService.addEvaluationCriteria(id, dto)
  }

  // DELETE /api/courses/:id/criteria/:criteriaId — Admin
  @Delete(':id/criteria/:criteriaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Eliminar un criterio de evaluación' })
  removeCriteria(
    @Param('id')         courseId:   string,
    @Param('criteriaId') criteriaId: string,
  ) {
    return this.coursesService.removeEvaluationCriteria(courseId, criteriaId)
  }

  // ════════════════════════════════════════════════════════════════════════
  // IDIOMAS
  // ════════════════════════════════════════════════════════════════════════

  // GET /api/courses/languages — PÚBLICO
  @Get('languages/list')
  @ApiOperation({ summary: 'Listar idiomas disponibles (público)' })
  getLanguages() {
    return this.coursesService.getLanguages()
  }

  // POST /api/courses/languages — Admin
  @Post('languages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Agregar nuevo idioma' })
  createLanguage(@Body() dto: CreateLanguageDto) {
    return this.coursesService.createLanguage(dto)
  }

  // PATCH /api/courses/languages/:id — Admin
  @Patch('languages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: '[Admin] Actualizar idioma (nombre o estado activo)' })
  @ApiParam({ name: 'id', description: 'UUID del idioma' })
  updateLanguage(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.coursesService.updateLanguage(id, body)
  }

  // DELETE /api/courses/languages/:id — Admin
  @Delete('languages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Eliminar idioma (solo si no tiene cursos)' })
  @ApiParam({ name: 'id', description: 'UUID del idioma' })
  deleteLanguage(@Param('id') id: string) {
    return this.coursesService.deleteLanguage(id)
  }

  // ════════════════════════════════════════════════════════════════════════
  // CICLOS ESCOLARES
  // ════════════════════════════════════════════════════════════════════════

  // GET /api/courses/cycles — Autenticado
  @Get('cycles/list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Listar ciclos escolares' })
  getCycles() {
    return this.coursesService.getCycles()
  }

  // GET /api/courses/cycles/active
  @Get('cycles/active')
  @ApiOperation({ summary: 'Obtener el ciclo escolar activo (público)' })
  getActiveCycle() {
    return this.coursesService.getActiveCycle()
  }

  // POST /api/courses/cycles — Admin
  @Post('cycles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Crear nuevo ciclo escolar' })
  createCycle(@Body() dto: CreateCycleDto) {
    return this.coursesService.createCycle(dto)
  }

  // PATCH /api/courses/cycles/:id/activate — Admin
  @Patch('cycles/:id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({
    summary:     '[Admin] Activar ciclo escolar',
    description: 'Activa este ciclo y desactiva automáticamente todos los demás.',
  })
  @ApiParam({ name: 'id', description: 'UUID del ciclo' })
  activateCycle(@Param('id') id: string) {
    return this.coursesService.activateCycle(id)
  }
}