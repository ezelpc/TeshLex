// src/auth/dto/change-password.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator'
import { ApiProperty }                    from '@nestjs/swagger'

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString()
  currentPassword: string

  @ApiProperty({
    description: 'Nueva contraseña (mínimo 8 caracteres)',
    minLength:   8,
  })
  @IsString()
  @MinLength(8,   { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100)
  newPassword: string
}