import { Injectable, UnauthorizedException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { SupabaseService } from '../supabase/supabase.service'
import type { LoginDto } from './auth.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly supabase: SupabaseService,
  ) {}

  async login(dto: LoginDto) {
    const { data, error } =
      await this.supabase.public.auth.signInWithPassword(dto)

    if (error || !data.session || !data.user.email) {
      throw new UnauthorizedException('Correo o contrasena incorrectos.')
    }

    const [profile] = await this.database.sql<
      {
        active: boolean
        display_name: string
        role: 'admin' | 'editor'
      }[]
    >`
      select display_name, role, active
      from public.profiles
      where id = ${data.user.id}
      limit 1
    `

    if (!profile?.active) {
      throw new UnauthorizedException('Este usuario no tiene acceso al panel.')
    }

    return {
      accessToken: data.session.access_token,
      expiresAt: data.session.expires_at,
      refreshToken: data.session.refresh_token,
      user: {
        displayName: profile.display_name,
        email: data.user.email,
        id: data.user.id,
        role: profile.role,
      },
    }
  }
}
