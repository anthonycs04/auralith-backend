import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { TransactionSql } from 'postgres'
import { DatabaseService } from '../database/database.service'
import type {
  CreateOrderDto,
  InventoryAdjustmentDto,
  OrderItemDto,
  OrdersQueryDto,
  UpdateOrderCustomerDto,
} from './orders.dto'

type LockedProduct = {
  id: string
  name: string
  price: string
  status: string
  stock: number
}

type OrderRow = {
  address: string | null
  city: string
  code: string
  created_at: string
  customer_name: string
  document_number: string | null
  email: string | null
  id: string
  items: Array<{
    id: string
    image: string | null
    name: string
    price: number
    productId: string
    quantity: number
    total: number
  }>
  note: string | null
  shipping_method: string
  source: string
  status: string
  subtotal: string
  total: string
  updated_at: string
  whatsapp: string
}

@Injectable()
export class OrdersService {
  constructor(private readonly database: DatabaseService) {}

  private mapOrder(row: OrderRow) {
    return {
      address: row.address,
      city: row.city,
      code: row.code,
      createdAt: row.created_at,
      customer: row.customer_name,
      deliveryType: row.shipping_method,
      documentNumber: row.document_number,
      email: row.email,
      id: row.id,
      items: row.items,
      note: row.note,
      source: row.source,
      status: row.status,
      subtotal: Number(row.subtotal),
      total: Number(row.total),
      updatedAt: row.updated_at,
      whatsapp: row.whatsapp,
    }
  }

  private orderSelect() {
    return `
      select
        o.*,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', oi.id,
                'productId', oi.product_id,
                'name', oi.product_name,
                'price', oi.unit_price::float8,
                'quantity', oi.quantity,
                'total', oi.line_total::float8,
                'image', (
                  select pi.public_url
                  from public.product_images pi
                  where pi.product_id = oi.product_id
                  order by pi.is_primary desc, pi.sort_order
                  limit 1
                )
              )
              order by oi.created_at
            )
            from public.order_items oi
            where oi.order_id = o.id
          ),
          '[]'::jsonb
        ) as items
      from public.orders o
    `
  }

  async list(query: OrdersQueryDto) {
    const rows = await this.database.sql.unsafe<OrderRow[]>(
      `
        ${this.orderSelect()}
        where ($1::text is null or o.source = $1)
          and ($2::text is null or o.status = $2)
          and (
            $3::text is null
            or o.code ilike '%' || $3 || '%'
            or o.customer_name ilike '%' || $3 || '%'
            or o.document_number ilike '%' || $3 || '%'
            or o.whatsapp ilike '%' || $3 || '%'
          )
        order by o.created_at desc
      `,
      [query.source ?? null, query.status ?? null, query.search?.trim() || null],
    )

    return rows.map((row) => this.mapOrder(row))
  }

  async get(id: string) {
    const [row] = await this.database.sql.unsafe<OrderRow[]>(
      `${this.orderSelect()} where o.id::text = $1 or o.code = $1 limit 1`,
      [id],
    )

    if (!row) {
      throw new NotFoundException('Pedido no encontrado.')
    }

    return this.mapOrder(row)
  }

  private async lockProduct(sql: TransactionSql, productId: string) {
    const [product] = await sql<LockedProduct[]>`
      select id, name, price, stock, status
      from public.products
      where id = ${productId}
      for update
    `

    if (!product) {
      throw new BadRequestException(`El producto ${productId} no existe.`)
    }

    return product
  }

  private async moveStock(
    sql: TransactionSql,
    product: LockedProduct,
    delta: number,
    movementType: string,
    reason: string,
    actorId: string | null,
    orderId: string | null,
  ) {
    const stockAfter = product.stock + delta
    const isStockDecrease = delta < 0

    if (
      isStockDecrease &&
      (product.status === 'hidden' ||
        product.status === 'draft' ||
        product.status === 'sold-out')
    ) {
      throw new BadRequestException(
        `${product.name} no esta disponible para venta.`,
      )
    }

    if (stockAfter < 0) {
      throw new BadRequestException(
        `Stock insuficiente para ${product.name}. Disponible: ${product.stock}.`,
      )
    }

    const status =
      product.status === 'draft' ||
      product.status === 'hidden' ||
      product.status === 'preorder'
        ? product.status
        : stockAfter === 0
          ? 'sold-out'
          : stockAfter <= 5
            ? 'low-stock'
            : 'available'

    await sql`
      update public.products
      set stock = ${stockAfter}, status = ${status}
      where id = ${product.id}
    `
    await sql`
      insert into public.inventory_movements (
        product_id, order_id, movement_type, quantity_delta, stock_before,
        stock_after, reason, created_by
      )
      values (
        ${product.id}, ${orderId}, ${movementType}, ${delta}, ${product.stock},
        ${stockAfter}, ${reason}, ${actorId}
      )
    `

    product.stock = stockAfter
    product.status = status
  }

  private validateItems(items: OrderItemDto[]) {
    if (items.length === 0) {
      throw new BadRequestException('El pedido debe incluir al menos un producto.')
    }

    const merged = new Map<string, number>()
    for (const item of items) {
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
    }

    return [...merged.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }))
  }

  async create(
    dto: CreateOrderDto,
    source: 'store' | 'tiktok' | 'web',
    actorId: string | null,
  ) {
    const items = this.validateItems(dto.items)
    const orderId = await this.database.sql.begin(async (transaction) => {
      const products: Array<{ product: LockedProduct; quantity: number }> = []
      let subtotal = 0

      for (const item of items) {
        const product = await this.lockProduct(transaction, item.productId)
        subtotal += Number(product.price) * item.quantity
        products.push({ product, quantity: item.quantity })
      }

      const [order] = await transaction<{ id: string }[]>`
        insert into public.orders (
          code, source, status, customer_name, document_number, whatsapp, email,
          city, address, shipping_method, note, subtotal, total, created_by
        )
        values (
          public.next_order_code(${source}), ${source}, 'new', ${dto.customerName},
          ${dto.documentNumber ?? null}, ${dto.whatsapp}, ${dto.email ?? null},
          ${dto.city}, ${dto.address ?? null}, ${dto.shippingMethod},
          ${dto.note ?? null}, ${subtotal}, ${subtotal}, ${actorId}
        )
        returning id
      `

      for (const { product, quantity } of products) {
        const unitPrice = Number(product.price)
        await this.moveStock(
          transaction,
          product,
          -quantity,
          'sale',
          `Pedido ${source}`,
          actorId,
          order.id,
        )
        await transaction`
          insert into public.order_items (
            order_id, product_id, product_name, unit_price, quantity, line_total
          )
          values (
            ${order.id}, ${product.id}, ${product.name}, ${unitPrice}, ${quantity},
            ${unitPrice * quantity}
          )
        `
      }

      await transaction`
        insert into public.audit_logs (
          actor_id, action, entity_type, entity_id, metadata
        )
        values (
          ${actorId}, 'order.created', 'order', ${order.id},
          ${transaction.json({ source, total: subtotal })}
        )
      `

      return order.id
    })

    return this.get(orderId)
  }

  async updateItems(id: string, nextItems: OrderItemDto[], actorId: string) {
    const items = this.validateItems(nextItems)

    await this.database.sql.begin(async (transaction) => {
      const [order] = await transaction<
        { id: string; status: string }[]
      >`
        select id, status from public.orders where id = ${id} for update
      `

      if (!order) {
        throw new NotFoundException('Pedido no encontrado.')
      }

      if (order.status === 'cancelled') {
        throw new BadRequestException(
          'No se pueden editar productos de un pedido cancelado.',
        )
      }

      const previous = await transaction<
        { product_id: string; quantity: number }[]
      >`
        select product_id, quantity
        from public.order_items
        where order_id = ${id}
      `
      const locked = new Map<string, LockedProduct>()
      const allProductIds = new Set([
        ...previous.map((item) => item.product_id),
        ...items.map((item) => item.productId),
      ])

      for (const productId of [...allProductIds].sort()) {
        locked.set(productId, await this.lockProduct(transaction, productId))
      }

      for (const item of previous) {
        await this.moveStock(
          transaction,
          locked.get(item.product_id)!,
          item.quantity,
          'order_edit',
          'Reposicion previa a edicion de pedido',
          actorId,
          id,
        )
      }

      await transaction`delete from public.order_items where order_id = ${id}`
      let subtotal = 0

      for (const item of items) {
        const product = locked.get(item.productId)!
        const unitPrice = Number(product.price)
        await this.moveStock(
          transaction,
          product,
          -item.quantity,
          'order_edit',
          'Reserva por edicion de pedido',
          actorId,
          id,
        )
        subtotal += unitPrice * item.quantity
        await transaction`
          insert into public.order_items (
            order_id, product_id, product_name, unit_price, quantity, line_total
          )
          values (
            ${id}, ${product.id}, ${product.name}, ${unitPrice}, ${item.quantity},
            ${unitPrice * item.quantity}
          )
        `
      }

      await transaction`
        update public.orders
        set subtotal = ${subtotal}, total = ${subtotal}
        where id = ${id}
      `
      await transaction`
        insert into public.audit_logs (
          actor_id, action, entity_type, entity_id, metadata
        )
        values (
          ${actorId}, 'order.items_updated', 'order', ${id},
          ${transaction.json({ total: subtotal })}
        )
      `
    })

    return this.get(id)
  }

  async updateStatus(id: string, nextStatus: string, actorId: string) {
    await this.database.sql.begin(async (transaction) => {
      const [order] = await transaction<
        { id: string; status: string }[]
      >`
        select id, status from public.orders where id = ${id} for update
      `

      if (!order) {
        throw new NotFoundException('Pedido no encontrado.')
      }

      if (order.status === nextStatus) {
        return
      }

      const items = await transaction<
        { product_id: string; quantity: number }[]
      >`
        select product_id, quantity from public.order_items where order_id = ${id}
      `

      if (nextStatus === 'cancelled' || order.status === 'cancelled') {
        for (const item of items) {
          const product = await this.lockProduct(transaction, item.product_id)
          const delta =
            nextStatus === 'cancelled' ? item.quantity : -item.quantity
          await this.moveStock(
            transaction,
            product,
            delta,
            nextStatus === 'cancelled' ? 'cancellation' : 'sale',
            nextStatus === 'cancelled'
              ? 'Pedido cancelado'
              : 'Pedido reactivado',
            actorId,
            id,
          )
        }
      }

      await transaction`
        update public.orders set status = ${nextStatus} where id = ${id}
      `
      await transaction`
        insert into public.audit_logs (
          actor_id, action, entity_type, entity_id, metadata
        )
        values (
          ${actorId}, 'order.status_updated', 'order', ${id},
          ${transaction.json({ from: order.status, to: nextStatus })}
        )
      `
    })

    return this.get(id)
  }

  async updateCustomer(
    id: string,
    dto: UpdateOrderCustomerDto,
    actorId: string,
  ) {
    const current = await this.get(id)
    await this.database.sql`
      update public.orders set
        customer_name = ${dto.customerName ?? current.customer},
        document_number = ${dto.documentNumber ?? current.documentNumber},
        whatsapp = ${dto.whatsapp ?? current.whatsapp},
        email = ${dto.email ?? current.email},
        city = ${dto.city ?? current.city},
        address = ${dto.address ?? current.address},
        shipping_method = ${dto.shippingMethod ?? current.deliveryType},
        note = ${dto.note ?? current.note}
      where id = ${id}
    `
    await this.database.sql`
      insert into public.audit_logs (actor_id, action, entity_type, entity_id)
      values (${actorId}, 'order.customer_updated', 'order', ${id})
    `
    return this.get(id)
  }

  async adjustInventory(dto: InventoryAdjustmentDto, actorId: string) {
    if (dto.quantityDelta === 0) {
      throw new BadRequestException('El ajuste no puede ser cero.')
    }

    await this.database.sql.begin(async (transaction) => {
      const product = await this.lockProduct(transaction, dto.productId)
      await this.moveStock(
        transaction,
        product,
        dto.quantityDelta,
        'adjustment',
        dto.reason,
        actorId,
        null,
      )
    })

    const [product] = await this.database.sql`
      select id, name, stock, status from public.products where id = ${dto.productId}
    `
    return product
  }

  inventoryMovements(productId?: string) {
    return this.database.sql`
      select
        im.id,
        im.product_id as "productId",
        p.name as "productName",
        im.order_id as "orderId",
        im.movement_type as "movementType",
        im.quantity_delta as "quantityDelta",
        im.stock_before as "stockBefore",
        im.stock_after as "stockAfter",
        im.reason,
        im.created_at as "createdAt"
      from public.inventory_movements im
      join public.products p on p.id = im.product_id
      where ${productId ?? null}::text is null or im.product_id = ${productId ?? null}
      order by im.created_at desc
      limit 500
    `
  }
}
