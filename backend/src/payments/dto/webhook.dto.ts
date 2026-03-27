// src/payments/dto/webhook.dto.ts
import { ApiProperty } from '@nestjs/swagger'
import { IsOptional } from 'class-validator'

export class WebhookDto {
  @ApiProperty({ required: false, description: 'Stripe enviará el body raw' })
  @IsOptional()
  type?: string
}
