// src/users/users.controller.ts
import {
  Controller, Get, Post, Patch,
  Body, Param, Query, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common'
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiQuery, ApiParam,
} from '@nestjs/swagger'
import { Role }                from '@prisma/client'
import { UsersService }        from './users.service'
import { RegisterStudentDto }  from './dto/register-student.dto'
import { CreateTeacherDto }    from './dto/create-teacher.dto'
import { UpdateUserDto, UpdateUserAdminDto } from './dto/update-user.dto'
import { TeacherCommentDto }   from './dto/update-user.dto'
import { JwtAuthGuard }        from '../common/guards/jwt-auth.guard'
import { RolesGuard }          from '../common/guards/roles.guard'
import { Roles }               from '../common/decorators/roles.decorator'
import { CurrentUser }         from '../common/decorators/current-user.decorator'

export interface JwtPayload {
  id: string
  email: string
  role: Role
  studentProfileId?: string
  teacherProfileId?: string
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── POST /api/users/register — PÚBLICO ──────────────────────────────────
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:     'Registrar nuevo alumno',
    description: 'Endpoint público. Crea un usuario con rol STUDENT y su perfil académico.',
  })
  register(@Body() dto: RegisterStudentDto) {
    return this.usersService.registerStudent(dto)
  }

  // ── GET /api/users/me ────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Ver mi perfil completo con historial' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(user.id)
  }

  // ── PATCH /api/users/me ──────────────────────────────────────────────────
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({
    summary:     'Actualizar mi perfil',
    description: 'El usuario puede actualizar: firstName, lastName, phone, avatarUrl.',
  })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto)
  }

  // ── GET /api/users/stats — Admin ─────────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: '[Admin] Estadísticas rápidas de usuarios' })
  getStats() {
    return this.usersService.getStats()
  }

  // ── GET /api/users/teachers ──────────────────────────────────────────────
  @Get('teachers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Listar profesores con sus cursos activos' })
  getTeachers() {
    return this.usersService.getTeachers()
  }

  // ── POST /api/users/teachers — Admin ─────────────────────────────────────
  @Post('teachers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] Registrar nuevo profesor' })
  registerTeacher(@Body() dto: CreateTeacherDto) {
    return this.usersService.registerTeacher(dto)
  }

  // ── POST /api/users/teachers/comments — Profesor ─────────────────────────
  @Post('teachers/comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Profesor] Enviar comentario al administrador' })
  sendComment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: TeacherCommentDto,
  ) {
    return this.usersService.sendTeacherComment(user.teacherProfileId!, dto.message)
  }

  // ── GET /api/users — Admin ───────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: '[Admin] Listar todos los usuarios con filtros' })
  @ApiQuery({ name: 'role',     enum: Role,    required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({ name: 'search',   type: String,  required: false, description: 'Buscar por nombre o email' })
  findAll(
    @Query('role')     role?:     Role,
    @Query('isActive') isActive?: string,
    @Query('search')   search?:   string,
  ) {
    return this.usersService.findAll({
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    })
  }

  // ── GET /api/users/:id — Admin ───────────────────────────────────────────
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: '[Admin] Ver detalle completo de un usuario' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id)
  }

  // ── PATCH /api/users/:id — Admin ─────────────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({
    summary:     '[Admin] Actualizar cualquier usuario',
    description: 'Admin puede cambiar todos los campos incluyendo isActive.',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  updateAdmin(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.usersService.updateAdmin(id, dto)
  }
}