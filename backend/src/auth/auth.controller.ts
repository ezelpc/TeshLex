// src/auth/auth.controller.ts
import {
  Controller, Post, Get, Body, Req,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import {
  ApiTags, ApiOperation, ApiResponse,
  ApiBearerAuth, ApiBody,
} from '@nestjs/swagger'
// FIX: import type para evitar error TS1272 con isolatedModules + emitDecoratorMetadata
import type { Request } from 'express'
import { AuthService }       from './auth.service'
import { LoginDto }          from './dto/login.dto'
import { RefreshDto }        from './dto/refresh.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { JwtAuthGuard }      from '../common/guards/jwt-auth.guard'
import { CurrentUser }       from '../common/decorators/current-user.decorator'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión — retorna accessToken + refreshToken' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  @ApiBody({ type: LoginDto })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    )
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens renovados' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  @ApiBody({ type: RefreshDto })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión — revoca el refresh token' })
  logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Body() body: { refreshToken?: string },
  ) {
    return this.authService.logout(user.id, body.refreshToken, req.ip)
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar contraseña — revoca todas las sesiones activas' })
  @ApiBody({ type: ChangePasswordDto })
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Perfil completo del usuario autenticado' })
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id)
  }
}