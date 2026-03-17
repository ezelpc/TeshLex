// src/courses/dto/evaluation-criteria.dto.ts
import {
  IsString, IsInt, IsOptional,
  Min, Max, MaxLength, ValidateNested,
} from 'class-validator'
import { Type }        from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class EvaluationCriteriaItemDto {
  @ApiProperty({ example: 'Examen Final' })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 40, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  percentage: number

  @ApiPropertyOptional({ example: 'Examen escrito al final del módulo' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number
}

export class AddEvaluationCriteriaDto {
  @ApiProperty({ type: [EvaluationCriteriaItemDto] })
  @ValidateNested({ each: true })
  @Type(() => EvaluationCriteriaItemDto)
  criteria: EvaluationCriteriaItemDto[]
}