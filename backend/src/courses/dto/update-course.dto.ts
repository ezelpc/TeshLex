// src/courses/dto/update-course.dto.ts
import { PartialType }   from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CourseStatus }  from '@prisma/client'
import { CreateCourseDto } from './create-course.dto'

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @ApiPropertyOptional({ enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus
}