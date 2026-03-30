// src/courses/dto/create-cycle.dto.ts
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional }           from '@nestjs/swagger'

export class CreateCycleDto {
  @ApiProperty({ example: 'Agosto — Diciembre 2025' })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty({ example: '2025-2' })
  @IsString()
  @MaxLength(20)
  code: string

  @ApiProperty({ example: '2025-08-04' })
  @IsString()
  startDate: string

  @ApiProperty({ example: '2025-11-28' })
  @IsString()
  endDate: string

  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ example: '2025-07-01' })
  @IsOptional()
  @IsString()
  enrollmentStart?: string

  @ApiPropertyOptional({ example: '2025-08-15' })
  @IsOptional()
  @IsString()
  enrollmentEnd?: string
}