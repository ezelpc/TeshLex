// src/enrollments/dto/drop.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class DropEnrollmentDto {
  @ApiProperty({ example: 'Cambio de horario laboral' })
  @IsString()
  @MinLength(5,   { message: 'El motivo debe tener al menos 5 caracteres' })
  @MaxLength(500)
  reason: string
}