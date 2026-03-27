// src/users/dto/create-teacher.dto.ts
import {
  IsEmail, IsString, IsOptional, IsArray,
  MinLength, MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class CreateTeacherDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  @MaxLength(100)
  firstName: string

  @ApiProperty({ example: 'García López' })
  @IsString()
  @MaxLength(150)
  lastName: string

  @ApiProperty({ example: 'ana.garcia@tesh.edu.mx' })
  @IsEmail({}, { message: 'El correo no es válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  @ApiProperty({ example: 'Profesor2025!', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string

  @ApiPropertyOptional({ example: ['Inglés', 'Francés'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[]

  @ApiPropertyOptional({ example: 'Licenciada en Lenguas con 8 años de experiencia.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string

  @ApiPropertyOptional({ example: '5512340001' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  maxStudents?: number
}