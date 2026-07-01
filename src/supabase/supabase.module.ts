import { Global, Module } from '@nestjs/common'
import { SupabaseService } from './supabase.service'

@Global()
@Module({
  exports: [SupabaseService],
  providers: [SupabaseService],
})
export class SupabaseModule {}
