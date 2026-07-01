import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import postgres, { type Sql } from 'postgres'

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly sql: Sql

  constructor(config: ConfigService) {
    const useSsl = config.getOrThrow<boolean>('DATABASE_SSL')

    this.sql = postgres(config.getOrThrow<string>('DATABASE_URL'), {
      max: 10,
      prepare: false,
      ssl: useSsl ? 'require' : false,
    })
  }

  async ping() {
    await this.sql`select 1 as connected`
  }

  async onModuleDestroy() {
    await this.sql.end()
  }
}
