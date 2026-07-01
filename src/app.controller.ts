import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from './database/database.service'

@Controller()
export class AppController {
  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  @Get()
  getApiInfo() {
    return {
      name: 'Auralith API',
      status: 'ready',
      version: '0.1.0',
    }
  }

  @Get('health')
  getHealth() {
    return {
      environment: this.config.getOrThrow<string>('NODE_ENV'),
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }

  @Get('health/database')
  async getDatabaseHealth() {
    try {
      await this.database.ping()

      return {
        database: 'postgresql',
        status: 'ok',
        timestamp: new Date().toISOString(),
      }
    } catch {
      throw new ServiceUnavailableException({
        database: 'postgresql',
        message:
          'No fue posible conectar. Revisa DATABASE_URL y los datos de Supabase.',
        status: 'unavailable',
      })
    }
  }
}
