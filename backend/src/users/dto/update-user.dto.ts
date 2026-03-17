// src/users/dto/update-user.dto.ts
import {
  IsString, IsOptional, IsBoolean, IsUrl,
  MaxLength, MinLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// ─────────────────────────────────────────────────────────────────────────────

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string

  @ApiPropertyOptional({ example: 'Velásquez Torres' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  lastName?: string

  @ApiPropertyOptional({ example: '5512345678' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string

  @ApiPropertyOptional({ example: 'https://storage.tesh.edu.mx/avatars/juan.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Solo admin puede cambiar isActive
// ─────────────────────────────────────────────────────────────────────────────

export class UpdateUserAdminDto extends UpdateUserDto {
  @ApiPropertyOptional({ example: false, description: 'Activar o desactivar la cuenta' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────

export class TeacherCommentDto {
  @ApiProperty({ example: 'Se requiere más material audiovisual para el nivel B1.' })
  @IsString()
  @MinLength(10, { message: 'El comentario debe tener al menos 10 caracteres' })
  @MaxLength(1000)
  message: string
}