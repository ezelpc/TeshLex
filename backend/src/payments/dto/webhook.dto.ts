// src/payments/dto/webhook.dto.ts
import { IsString, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class WebhookDataDto {
  @IsString()
  id: string
}

export class WebhookDto {
  @IsString()
  @IsOptional()
  id?: string

  @IsString()
  type: string

  @ValidateNested()
  @Type(() => WebhookDataDto)
  @IsOptional()
  data?: WebhookDataDto
}
