import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  controllers: [DashboardController],
  imports: [AuthModule],
  providers: [DashboardService],
})
export class DashboardModule {}
