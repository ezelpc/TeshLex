// src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Transform }   from 'class-transformer'

export class LoginDto {
  @ApiProperty({
    example:     'alumno@tesh.edu.mx',
    description: 'Correo electrónico registrado',
  })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  @ApiProperty({
    example:     'Alumno2025!',
    description: 'Contraseña de la cuenta',
  })
  @IsString()
  @MinLength(6,  { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(100)
  password: string
}