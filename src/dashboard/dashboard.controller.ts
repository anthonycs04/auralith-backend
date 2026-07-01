import { Controller, Get, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../auth/admin.guard'
import { DashboardService } from './dashboard.service'

@Controller('admin/dashboard')
@UseGuards(AdminGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get() {
    return this.dashboard.get()
  }
}
