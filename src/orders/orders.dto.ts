import { Type } from 'class-transformer'
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

export const orderSources = ['web', 'tiktok', 'store'] as const
export const orderStatuses = [
  'new',
  'contacted',
  'confirmed',
  'preparing',
  'delivered',
  'cancelled',
] as const
export const shippingMethods = [
  'Flores',
  'Shalom',
  'Olva Courier',
  'Marvisur',
  'Recojo en tienda',
] as const

export class OrderItemDto {
  @IsString()
  productId!: string

  @IsInt()
  @Min(1)
  quantity!: number
}

export class CreateOrderDto {
  @IsOptional()
  @IsIn(orderSources)
  source?: (typeof orderSources)[number]

  @IsString()
  customerName!: string

  @IsOptional()
  @IsString()
  documentNumber?: string

  @IsString()
  whatsapp!: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsString()
  city!: string

  @IsOptional()
  @IsString()
  address?: string

  @IsIn(shippingMethods)
  shippingMethod!: (typeof shippingMethods)[number]

  @IsOptional()
  @IsString()
  note?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[]
}

export class UpdateOrderItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[]
}

export class UpdateOrderStatusDto {
  @IsIn(orderStatuses)
  status!: (typeof orderStatuses)[number]
}

export class UpdateOrderCustomerDto {
  @IsOptional()
  @IsString()
  customerName?: string

  @IsOptional()
  @IsString()
  documentNumber?: string

  @IsOptional()
  @IsString()
  whatsapp?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsIn(shippingMethods)
  shippingMethod?: (typeof shippingMethods)[number]

  @IsOptional()
  @IsString()
  note?: string
}

export class OrdersQueryDto {
  @IsOptional()
  @IsIn(orderSources)
  source?: (typeof orderSources)[number]

  @IsOptional()
  @IsIn(orderStatuses)
  status?: (typeof orderStatuses)[number]

  @IsOptional()
  @IsString()
  search?: string
}

export class InventoryAdjustmentDto {
  @IsString()
  productId!: string

  @IsInt()
  quantityDelta!: number

  @IsString()
  reason!: string
}
