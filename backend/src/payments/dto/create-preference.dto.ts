// src/payments/dto/create-preference.dto.ts
import { IsUUID, IsNotEmpty } from 'class-validator'
import { ApiProperty }        from '@nestjs/swagger'

export class CreatePreferenceDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la inscripción a pagar',
  })
  @IsUUID('4', { message: 'El enrollmentId debe ser un UUID válido' })
  @IsNotEmpty()
  enrollmentId: string
}
