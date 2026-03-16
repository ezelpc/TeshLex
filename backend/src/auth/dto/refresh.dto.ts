// src/auth/dto/refresh.dto.ts
import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty }          from '@nestjs/swagger'

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token obtenido en el login' })
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es requerido' })
  refreshToken: string
}