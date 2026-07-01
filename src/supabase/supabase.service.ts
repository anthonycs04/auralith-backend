import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
  readonly admin: SupabaseClient
  readonly public: SupabaseClient

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('SUPABASE_URL')

    this.public = createClient(
      url,
      config.getOrThrow<string>('SUPABASE_PUBLISHABLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    this.admin = createClient(
      url,
      config.getOrThrow<string>('SUPABASE_SECRET_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )
  }
}
