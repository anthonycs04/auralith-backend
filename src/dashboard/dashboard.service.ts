import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async get() {
    const [metrics] = await this.database.sql`
      select
        count(*) filter (where status = 'new')::int as "newOrders",
        count(*) filter (
          where status in ('new', 'contacted', 'confirmed', 'preparing')
        )::int as "pendingOrders",
        coalesce(sum(total) filter (
          where status <> 'cancelled' and created_at::date = current_date
        ), 0)::float8 as "todayRevenue",
        coalesce(sum(total) filter (where status <> 'cancelled'), 0)::float8 as "totalRevenue",
        count(*) filter (where source = 'web' and status <> 'cancelled')::int as "webOrders",
        count(*) filter (where source = 'tiktok' and status <> 'cancelled')::int as "tiktokOrders",
        count(*) filter (where source = 'store' and status <> 'cancelled')::int as "storeOrders"
      from public.orders
    `
    const [{ count: lowStock }] = await this.database.sql<
      { count: number }[]
    >`
      select count(*)::int as count
      from public.products
      where stock <= 5 and status not in ('draft', 'hidden')
    `
    const channels = await this.database.sql`
      select
        source,
        count(*)::int as orders,
        coalesce(sum(total), 0)::float8 as revenue
      from public.orders
      where status <> 'cancelled'
      group by source
      order by source
    `
    const statuses = await this.database.sql`
      select status, count(*)::int as count
      from public.orders
      group by status
      order by status
    `
    const topProducts = await this.database.sql`
      select
        oi.product_id as "productId",
        max(oi.product_name) as name,
        sum(oi.quantity)::int as units,
        sum(oi.line_total)::float8 as revenue
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.status <> 'cancelled'
      group by oi.product_id
      order by units desc, revenue desc
      limit 8
    `
    const criticalStock = await this.database.sql`
      select
        p.id, p.name, p.stock, p.status,
        (
          select pi.public_url
          from public.product_images pi
          where pi.product_id = p.id
          order by pi.is_primary desc, pi.sort_order
          limit 1
        ) as image
      from public.products p
      where p.stock <= 5 and p.status not in ('draft', 'hidden')
      order by p.stock, p.name
      limit 12
    `
    const recentOrders = await this.database.sql`
      select
        id, code, customer_name as customer, total::float8, source, status,
        created_at as "createdAt"
      from public.orders
      order by created_at desc
      limit 10
    `

    return {
      channels,
      criticalStock,
      metrics: { ...metrics, lowStock },
      recentOrders,
      statuses,
      topProducts,
    }
  }
}
