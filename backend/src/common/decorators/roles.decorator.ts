// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common'
import { Role }        from '@prisma/client'

export const ROLES_KEY = 'roles'

/**
 * Restringe el endpoint a los roles especificados.
 * Usar junto con RolesGuard.
 *
 * @example
 * @Roles(Role.ADMIN, Role.SUPERADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)