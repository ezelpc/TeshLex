// src/prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common'
import { PrismaService }  from './prisma.service'

@Global() // Disponible en toda la app sin importar en cada módulo
@Module({
  providers: [PrismaService],
  exports:   [PrismaService],
})
export class PrismaModule {}