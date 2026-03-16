// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { Prisma }            from '@prisma/client'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx      = host.switchToHttp()
    const res      = ctx.getResponse<Response>()
    const req      = ctx.getRequest<Request>()

    let status  = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Error interno del servidor'
    let errors: any = null

    // ── Errores HTTP de NestJS ────────────────────────────────────────────
    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const body = exception.getResponse()
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const msg = (body as any).message
        if (Array.isArray(msg)) {
          message = 'Error de validación'
          errors  = msg
        } else {
          message = msg
        }
      } else {
        message = exception.message
      }
    }

    // ── Errores de Prisma ─────────────────────────────────────────────────
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status  = HttpStatus.CONFLICT
          message = `Ya existe un registro con ese valor (${(exception.meta?.target as string[])?.join(', ')})`
          break
        case 'P2025':
          status  = HttpStatus.NOT_FOUND
          message = 'Registro no encontrado'
          break
        case 'P2003':
          status  = HttpStatus.BAD_REQUEST
          message = 'Referencia inválida: el registro relacionado no existe'
          break
        default:
          status  = HttpStatus.BAD_REQUEST
          message = 'Error en la base de datos'
      }
    }

    // ── Errores no controlados ────────────────────────────────────────────
    else {
      this.logger.error(
        `[${req.method}] ${req.url} → ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
      )
    }

    res.status(status).json({
      success:    false,
      statusCode: status,
      message,
      errors,
      path:       req.url,
      timestamp:  new Date().toISOString(),
    })
  }
}