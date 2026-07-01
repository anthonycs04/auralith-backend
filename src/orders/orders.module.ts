import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminOrdersController } from './admin-orders.controller'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { OrderPdfService } from './order-pdf.service'

@Module({
  controllers: [OrdersController, AdminOrdersController],
  exports: [OrdersService],
  imports: [AuthModule],
  providers: [OrdersService, OrderPdfService],
})
export class OrdersModule {}
