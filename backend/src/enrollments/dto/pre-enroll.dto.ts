// src/enrollments/dto/pre-enroll.dto.ts
import { IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class PreEnrollDto {
  @ApiProperty({ description: 'UUID del curso al que se desea inscribir' })
  @IsUUID()
  courseId: string
}