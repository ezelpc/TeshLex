// src/enrollments/dto/record-attendance.dto.ts
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional }           from '@nestjs/swagger'

export class RecordAttendanceDto {
  @ApiProperty({ example: '2025-09-15', description: 'Fecha de la clase (YYYY-MM-DD)' })
  @IsString()
  date: string

  @ApiProperty({ example: true })
  @IsBoolean()
  present: boolean

  @ApiPropertyOptional({ example: 'Llegó tarde 15 min' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string
}