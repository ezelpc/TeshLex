// src/users/dto/register-student.dto.ts
import {
  IsEmail, IsString, IsOptional, IsInt,
  MinLength, MaxLength, Min, Max, Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class RegisterStudentDto {
  @ApiProperty({ example: 'VELÁSQUEZ TORRES Juan' })
  @IsString()
  @MaxLength(100)
  firstName: string

  @ApiProperty({ example: 'Velásquez Torres' })
  @IsString()
  @MaxLength(150)
  lastName: string

  @ApiProperty({ example: 'alumno@tesh.edu.mx' })
  @IsEmail({}, { message: 'El correo no es válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  @ApiProperty({ example: 'MiContraseña2025!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100)
  password: string

  @ApiProperty({ example: 'TESH2024001' })
  @IsString()
  @MaxLength(20)
  matricula: string

  @ApiProperty({ example: 'Ing. en Sistemas Computacionales' })
  @IsString()
  @MaxLength(150)
  career: string

  @ApiProperty({ example: 4, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  semester: number

  @ApiPropertyOptional({ example: '5512345678' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string

  @ApiPropertyOptional({ example: '2000-05-15' })
  @IsOptional()
  @IsString()
  birthDate?: string

  @ApiPropertyOptional({ example: 'VELJ000515HDFRZN09', maxLength: 18 })
  @IsOptional()
  @IsString()
  @MaxLength(18)
  @Matches(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/i, {
    message: 'La CURP no tiene el formato correcto',
  })
  curp?: string
}