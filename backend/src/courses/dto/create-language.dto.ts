// src/courses/dto/create-language.dto.ts
import { IsString, MaxLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateLanguageDto {
  @ApiProperty({ example: 'Japonés' })
  @IsString()
  @MaxLength(80)
  name: string

  @ApiProperty({ example: 'ja', description: 'Código ISO 639-1 (2-5 letras)' })
  @IsString()
  @MaxLength(5)
  @Matches(/^[a-z]{2,5}$/, { message: 'El código debe ser 2-5 letras minúsculas' })
  code: string
}