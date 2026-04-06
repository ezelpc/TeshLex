// src/common/decorators/public.decorator.ts
// 🔓 Decorator @Public() — Marca endpoints que NO requieren JWT
// Uso: @Public() en controladores que deben ser públicos (ej: /api/health)

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
