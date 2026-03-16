// prisma.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Prisma ORM v7 — Configuración oficial
// La URL de conexión ya NO va en schema.prisma, va aquí.
// Documentación: https://pris.ly/d/config-datasource
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  // Ruta al schema
  schema: 'prisma/schema.prisma',

  // Configuración de migraciones
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },

  // Conexión — reemplaza `url = env("DATABASE_URL")` del schema.prisma
  datasource: {
    url: env('DATABASE_URL'),
  },
})