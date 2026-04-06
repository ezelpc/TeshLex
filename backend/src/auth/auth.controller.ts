// src/auth/auth.controller.ts
import {
  Controller, Post, Get, Body, Req, Res,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import {
  ApiTags, ApiOperation, ApiResponse,
  ApiBearerAuth, ApiBody,
} from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { LoginThrottlerGuard } from './guards/login-throttler.guard'
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

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production'
    const baseOpts = { httpOnly: true, secure: isProd, sameSite: 'strict' as const }
    // accessToken va con cada request a /api
    res.cookie('accessToken', accessToken, {
      ...baseOpts,
      path: '/api',
      maxAge: 15 * 60 * 1000,
    })
    // refreshToken SOLO va a /api/auth/refresh — reduce superficie de ataque
    res.cookie('refreshToken', refreshToken, {
      ...baseOpts,
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
  }

  @Post('login')
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión — retorna accessToken + refreshToken' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    )
    this.setCookies(res, result.accessToken, result.refreshToken)
    return { user: result.user }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens renovados' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  @ApiBody({ type: RefreshDto, required: false })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto?: RefreshDto) {
    const cookies = req.headers.cookie?.split(';').reduce((acc, c) => {
      const [k, v] = c.trim().split('=')
      return { ...acc, [k]: v }
    }, {} as Record<string, string>) || {}
    const token = cookies.refreshToken || dto?.refreshToken
    
    if (!token) throw new Error('No refresh token provided')
    
    const result = await this.authService.refresh(token)
    this.setCookies(res, result.accessToken, result.refreshToken)
    return { message: 'Token renovado' }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-Auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión — revoca el refresh token' })
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.headers.cookie?.split(';').reduce((acc, c) => {
      const [k, v] = c.trim().split('=')
      return { ...acc, [k]: v }
    }, {} as Record<string, string>) || {}
    
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')
    
    return this.authService.logout(user.id, cookies.refreshToken, req.ip)
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