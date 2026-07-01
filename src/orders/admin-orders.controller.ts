import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import type { AdminRequest } from '../auth/admin.guard'
import { AdminGuard } from '../auth/admin.guard'
import {
  CreateOrderDto,
  InventoryAdjustmentDto,
  OrdersQueryDto,
  UpdateOrderCustomerDto,
  UpdateOrderItemsDto,
  UpdateOrderStatusDto,
} from './orders.dto'
import { OrdersService } from './orders.service'
import { OrderPdfService } from './order-pdf.service'

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly pdf: OrderPdfService,
  ) {}

  @Get('orders')
  list(@Query() query: OrdersQueryDto) {
    return this.orders.list(query)
  }

  @Get('orders/:id')
  get(@Param('id') id: string) {
    return this.orders.get(id)
  }

  @Get('orders/:id/shipping-label.pdf')
  async shippingLabel(
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ) {
    const order = await this.orders.get(id)
    const pdf = await this.pdf.createShippingLabel(id)

    return reply
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `attachment; filename="etiqueta-${order.code}.pdf"`,
      )
      .send(pdf)
  }

  @Post('orders')
  create(@Body() dto: CreateOrderDto, @Req() request: AdminRequest) {
    return this.orders.create(
      dto,
      dto.source ?? 'tiktok',
      request.adminUser.id,
    )
  }

  @Patch('orders/:id/items')
  updateItems(
    @Param('id') id: string,
    @Body() dto: UpdateOrderItemsDto,
    @Req() request: AdminRequest,
  ) {
    return this.orders.updateItems(id, dto.items, request.adminUser.id)
  }

  @Patch('orders/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() request: AdminRequest,
  ) {
    return this.orders.updateStatus(id, dto.status, request.adminUser.id)
  }

  @Patch('orders/:id/customer')
  updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateOrderCustomerDto,
    @Req() request: AdminRequest,
  ) {
    return this.orders.updateCustomer(id, dto, request.adminUser.id)
  }

  @Get('inventory/movements')
  movements(@Query('productId') productId?: string) {
    return this.orders.inventoryMovements(productId)
  }

  @Post('inventory/adjustments')
  adjust(
    @Body() dto: InventoryAdjustmentDto,
    @Req() request: AdminRequest,
  ) {
    return this.orders.adjustInventory(dto, request.adminUser.id)
  }
}
