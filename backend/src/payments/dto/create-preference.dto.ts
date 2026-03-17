// src/payments/dto/create-preference.dto.ts
import { IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreatePreferenceDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID de la inscripción para la que se genera el pago',
  })
  @IsUUID()
  enrollmentId: string
}
