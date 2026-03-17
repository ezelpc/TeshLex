// src/enrollments/dto/save-grades.dto.ts
import {
  IsArray, IsString, IsNumber, IsOptional,
  IsUUID, Min, Max, MaxLength,
  ValidateNested, ArrayNotEmpty,
} from 'class-validator'
import { Type }        from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CriteriaGradeItemDto {
  @ApiProperty({ description: 'UUID del criterio de evaluación' })
  @IsUUID()
  criteriaId: string

  @ApiProperty({ example: 'Examen Final' })
  @IsString()
  @MaxLength(100)
  criteriaName: string

  @ApiProperty({ example: 8.5, minimum: 0, maximum: 10 })
  @IsNumber()
  @Min(0)
  @Max(10)
  score: number

  @ApiProperty({ example: 40, description: 'Peso porcentual del criterio' })
  @IsNumber()
  @Min(1)
  @Max(100)
  weight: number
}

export class SaveGradesDto {
  @ApiProperty({ type: [CriteriaGradeItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CriteriaGradeItemDto)
  criteriaGrades: CriteriaGradeItemDto[]

  @ApiPropertyOptional({ example: 'Excelente participación en clase.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string
}