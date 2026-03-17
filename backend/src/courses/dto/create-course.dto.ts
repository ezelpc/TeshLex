// src/courses/dto/create-course.dto.ts
import {
  IsEnum, IsString, IsOptional, IsInt,
  IsArray, IsNumber, IsUUID,
  Min, Max, MaxLength, ArrayNotEmpty,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { LanguageLevel, CourseModality }    from '@prisma/client'

export class CreateCourseDto {
  @ApiProperty({ description: 'UUID del idioma', example: 'uuid-del-idioma' })
  @IsUUID()
  languageId: string

  @ApiProperty({ enum: LanguageLevel, example: LanguageLevel.B1 })
  @IsEnum(LanguageLevel)
  level: LanguageLevel

  @ApiProperty({ enum: CourseModality, example: CourseModality.WEEKDAY })
  @IsEnum(CourseModality)
  modality: CourseModality

  @ApiProperty({ example: 'Lunes, Miércoles, Viernes — 9:00 a 11:00' })
  @IsString()
  @MaxLength(200)
  scheduleDescription: string

  @ApiProperty({ example: '09:00' })
  @IsString()
  @MaxLength(5)
  startTime: string

  @ApiProperty({ example: '11:00' })
  @IsString()
  @MaxLength(5)
  endTime: string

  @ApiProperty({ example: '2025-08-04' })
  @IsString()
  startDate: string

  @ApiProperty({ example: '2025-11-28' })
  @IsString()
  endDate: string

  @ApiProperty({ example: [1, 3, 5], description: '1=Lun, 2=Mar, ... 7=Dom' })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  daysOfWeek: number[]

  @ApiPropertyOptional({ example: 35 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  maxStudents?: number

  @ApiPropertyOptional({ example: 1500.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  enrollmentFee?: number

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyFee?: number

  @ApiPropertyOptional({ example: 350.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  materialFee?: number

  @ApiPropertyOptional({ description: 'UUID del profesor asignado' })
  @IsOptional()
  @IsUUID()
  teacherId?: string

  @ApiPropertyOptional({ description: 'UUID del ciclo escolar' })
  @IsOptional()
  @IsUUID()
  cycleId?: string

  @ApiPropertyOptional({ example: 'Curso introductorio de inglés.' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}