import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { validateEnvironment } from './config/env.validation'
import { DatabaseModule } from './database/database.module'
import { SupabaseModule } from './supabase/supabase.module'
import { AuthModule } from './auth/auth.module'
import { CatalogModule } from './catalog/catalog.module'
import { ComplaintsModule } from './complaints/complaints.module'
import { ContentModule } from './content/content.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { OrdersModule } from './orders/orders.module'

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    SupabaseModule,
    AuthModule,
    CatalogModule,
    OrdersModule,
    ContentModule,
    ComplaintsModule,
    DashboardModule,
  ],
})
export class AppModule {}
