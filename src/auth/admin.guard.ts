import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { DatabaseService } from '../database/database.service'
import { SupabaseService } from '../supabase/supabase.service'
import type { AdminIdentity } from './auth.types'

export type AdminRequest = FastifyRequest & {
  adminUser: AdminIdentity
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly database: DatabaseService,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>()
    const authorization = request.headers.authorization
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null

    if (!token) {
      throw new UnauthorizedException('Sesion administrativa requerida.')
    }

    const { data, error } = await this.supabase.admin.auth.getUser(token)

    if (error || !data.user?.email) {
      throw new UnauthorizedException('La sesion expiro o no es valida.')
    }

    const [profile] = await this.database.sql<
      {
        active: boolean
        display_name: string
        email: string
        id: string
        role: 'admin' | 'editor'
      }[]
    >`
      select id, email, display_name, role, active
      from public.profiles
      where id = ${data.user.id}
      limit 1
    `

    if (!profile?.active) {
      throw new UnauthorizedException('Este usuario no tiene acceso al panel.')
    }

    request.adminUser = {
      displayName: profile.display_name,
      email: profile.email,
      id: profile.id,
      role: profile.role,
    }

    return true
  }
}
