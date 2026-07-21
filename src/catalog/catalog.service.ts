import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { DatabaseService } from '../database/database.service'
import type {
  CatalogQueryDto,
  CategoryDto,
  IntentionDto,
  ProductDto,
  SubcategoryDto,
} from './catalog.dto'

type ProductRow = {
  [key: string]: unknown
  bestseller: boolean
  care_instructions: string[]
  category_id: string
  category_name: string
  chakras: string[]
  compare_at_price: string | null
  created_at: string
  currency: string
  description: string
  dimensions: Record<string, unknown>
  energetic_properties: string[]
  featured: boolean
  id: string
  images: Array<{
    altText: string
    height: number | null
    id: string
    isPrimary: boolean
    src: string
    width: number | null
  }>
  ingredients: string[]
  intention_ids: string[]
  is_new: boolean
  materials: string[]
  name: string
  origin: Record<string, unknown>
  price: string
  ritual: Record<string, unknown>
  seo: Record<string, unknown>
  short_description: string
  sku: string
  slug: string
  status: string
  stock: number
  subcategory_ids: string[]
  subtitle: string
  sustainability: Record<string, unknown>
  tags: string[]
  updated_at: string
  zodiac_signs: string[]
}

@Injectable()
export class CatalogService {
  constructor(private readonly database: DatabaseService) {}

  private mapProduct(row: ProductRow) {
    return {
      bestseller: row.bestseller,
      careInstructions: row.care_instructions,
      categoryId: row.category_id,
      categoryName: row.category_name,
      chakras: row.chakras,
      compareAtPrice:
        row.compare_at_price === null ? null : Number(row.compare_at_price),
      createdAt: row.created_at,
      currency: row.currency,
      description: row.description,
      dimensions: row.dimensions,
      energeticProperties: row.energetic_properties,
      featured: row.featured,
      id: row.id,
      images: row.images,
      ingredients: row.ingredients,
      intentionIds: row.intention_ids,
      isNew: row.is_new,
      materials: row.materials,
      name: row.name,
      origin: row.origin,
      price: Number(row.price),
      ritual: row.ritual,
      seo: row.seo,
      shortDescription: row.short_description,
      sku: row.sku,
      slug: row.slug,
      status: row.status,
      stock: row.stock,
      subcategoryIds: row.subcategory_ids,
      subtitle: row.subtitle,
      sustainability: row.sustainability,
      tags: row.tags,
      updatedAt: row.updated_at,
      zodiacSigns: row.zodiac_signs,
    }
  }

  private productSelect() {
    return `
      select
        p.*,
        c.name as category_name,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', pi.id,
                'src', pi.public_url,
                'altText', pi.alt_text,
                'width', pi.width,
                'height', pi.height,
                'isPrimary', pi.is_primary
              )
              order by pi.sort_order
            )
            from public.product_images pi
            where pi.product_id = p.id
          ),
          '[]'::jsonb
        ) as images,
        coalesce(
          (
            select array_agg(pin.intention_id order by pin.intention_id)
            from public.product_intentions pin
            where pin.product_id = p.id
          ),
          '{}'::text[]
        ) as intention_ids
        ,
        coalesce(
          (
            select array_agg(ps.subcategory_id order by ps.subcategory_id)
            from public.product_subcategories ps
            where ps.product_id = p.id
          ),
          '{}'::text[]
        ) as subcategory_ids
      from public.products p
      join public.categories c on c.id = p.category_id
    `
  }

  async listProducts(query: CatalogQueryDto, includeHidden = false) {
    const category = query.categoria ?? null
    const intention = query.intencion ?? null
    const subcategory = query.subcategoria ?? null
    const search = query.buscar?.trim() || null
    const sort = query.sort ?? 'featured'
    const orderBy =
      sort === 'price-asc'
        ? 'p.price asc'
        : sort === 'price-desc'
          ? 'p.price desc'
          : sort === 'newest'
            ? 'p.created_at desc'
            : 'p.featured desc, p.created_at desc'
    const visibility = includeHidden
      ? 'true'
      : "p.status in ('available', 'low-stock', 'sold-out', 'preorder')"
    const categoryVisibility = includeHidden ? 'true' : 'c.active'
    const rows = await this.database.sql.unsafe<ProductRow[]>(
      `
        ${this.productSelect()}
        where ${visibility}
          and ${categoryVisibility}
          and ($1::text is null or p.category_id = $1 or c.slug = $1)
          and (
            $2::text is null
            or exists (
              select 1
              from public.product_intentions filter_intention
              join public.intentions i on i.id = filter_intention.intention_id
              where filter_intention.product_id = p.id
                and (i.id = $2 or i.slug = $2)
            )
          )
          and (
            $3::text is null
            or exists (
              select 1
              from public.product_subcategories filter_subcategory
              join public.subcategories sc
                on sc.id = filter_subcategory.subcategory_id
              where filter_subcategory.product_id = p.id
                and (sc.id = $3 or sc.slug = $3)
                and (${includeHidden} or sc.active)
            )
          )
          and (
            $4::text is null
            or p.name ilike '%' || $4 || '%'
            or p.description ilike '%' || $4 || '%'
            or p.sku ilike '%' || $4 || '%'
          )
        order by ${orderBy}
      `,
      [category, intention, subcategory, search],
    )

    return rows.map((row) => this.mapProduct(row))
  }

  async getProduct(slugOrId: string, includeHidden = false) {
    const [row] = await this.database.sql.unsafe<ProductRow[]>(
      `
        ${this.productSelect()}
        where (p.slug = $1 or p.id = $1)
          and (
            $2::boolean
            or (
              p.status in ('available', 'low-stock', 'sold-out', 'preorder')
              and c.active
            )
          )
        limit 1
      `,
      [slugOrId, includeHidden],
    )

    if (!row) {
      throw new NotFoundException('Producto no encontrado.')
    }

    return this.mapProduct(row)
  }

  async listCategories(includeInactive = false) {
    return this.database.sql`
      select
        c.id,
        c.slug,
        c.name,
        c.short_name as "shortName",
        c.description,
        c.hero_copy as "heroCopy",
        c.image_url as "imageUrl",
        c.accent_color as "accentColor",
        c.featured,
        c.active,
        c.sort_order as "sortOrder",
        c.seo,
        count(distinct p.id)::int as "productCount",
        coalesce(array_agg(distinct ci.intention_id) filter (where ci.intention_id is not null), '{}') as "intentionIds"
      from public.categories c
      left join public.products p on p.category_id = c.id
        and p.status in ('available', 'low-stock', 'sold-out', 'preorder')
      left join public.category_intentions ci on ci.category_id = c.id
      where ${includeInactive} or c.active
      group by c.id
      order by c.sort_order, c.name
    `
  }

  async listSubcategories(includeInactive = false) {
    return this.database.sql`
      select
        sc.id,
        sc.category_id as "categoryId",
        c.slug as "categorySlug",
        sc.slug,
        sc.name,
        sc.description,
        sc.active,
        sc.sort_order as "sortOrder",
        sc.seo,
        count(distinct p.id)::int as "productCount"
      from public.subcategories sc
      join public.categories c on c.id = sc.category_id
      left join public.product_subcategories ps on ps.subcategory_id = sc.id
      left join public.products p on p.id = ps.product_id
        and p.status in ('available', 'low-stock', 'sold-out', 'preorder')
      where ${includeInactive} or (sc.active and c.active)
      group by sc.id, c.slug, c.sort_order
      order by c.sort_order, sc.sort_order, sc.name
    `
  }

  async listIntentions(includeInactive = false) {
    return this.database.sql`
      select
        i.id,
        i.slug,
        i.name,
        i.affirmation,
        i.description,
        i.ritual_prompt as "ritualPrompt",
        i.image_url as "imageUrl",
        i.icon,
        i.color,
        i.benefits,
        i.active,
        i.sort_order as "sortOrder",
        i.seo,
        coalesce(array_agg(distinct pi.product_id) filter (where pi.product_id is not null), '{}') as "recommendedProductIds",
        coalesce(array_agg(distinct ci.category_id) filter (where ci.category_id is not null), '{}') as "relatedCategoryIds"
      from public.intentions i
      left join public.product_intentions pi on pi.intention_id = i.id
      left join public.category_intentions ci on ci.intention_id = i.id
      where ${includeInactive} or i.active
      group by i.id
      order by i.sort_order, i.name
    `
  }

  async saveCategory(dto: CategoryDto, id?: string) {
    const categoryId = id ?? dto.id ?? dto.slug

    await this.database.sql.begin(async (transaction) => {
      await transaction`
        insert into public.categories (
          id, slug, name, short_name, description, hero_copy, image_url,
          accent_color, featured, active, sort_order, seo
        )
        values (
          ${categoryId}, ${dto.slug}, ${dto.name}, ${dto.shortName},
          ${dto.description ?? ''}, ${dto.heroCopy ?? ''},
          ${dto.imageUrl ?? null}, ${dto.accentColor ?? '#C9A86A'},
          ${dto.featured ?? false}, ${dto.active ?? true},
          ${dto.sortOrder ?? 0}, ${transaction.json((dto.seo ?? {}) as never)}
        )
        on conflict (id) do update set
          slug = excluded.slug,
          name = excluded.name,
          short_name = excluded.short_name,
          description = excluded.description,
          hero_copy = excluded.hero_copy,
          image_url = excluded.image_url,
          accent_color = excluded.accent_color,
          featured = excluded.featured,
          active = excluded.active,
          sort_order = excluded.sort_order,
          seo = excluded.seo
      `

      if (dto.intentionIds) {
        await transaction`
          delete from public.category_intentions where category_id = ${categoryId}
        `
        for (const intentionId of dto.intentionIds) {
          await transaction`
            insert into public.category_intentions (category_id, intention_id)
            values (${categoryId}, ${intentionId})
          `
        }
      }
    })

    return { id: categoryId }
  }

  async saveSubcategory(dto: SubcategoryDto, id?: string) {
    const subcategoryId = id ?? dto.id ?? `${dto.categoryId}-${dto.slug}`

    await this.database.sql`
      insert into public.subcategories (
        id, category_id, slug, name, description, active, sort_order, seo
      )
      values (
        ${subcategoryId}, ${dto.categoryId}, ${dto.slug}, ${dto.name},
        ${dto.description ?? ''}, ${dto.active ?? true}, ${dto.sortOrder ?? 0},
        ${this.database.sql.json((dto.seo ?? {}) as never)}
      )
      on conflict (id) do update set
        category_id = excluded.category_id,
        slug = excluded.slug,
        name = excluded.name,
        description = excluded.description,
        active = excluded.active,
        sort_order = excluded.sort_order,
        seo = excluded.seo
    `

    return { id: subcategoryId }
  }

  async deleteSubcategory(id: string) {
    const [{ count }] = await this.database.sql<{ count: number }[]>`
      select count(*)::int as count
      from public.product_subcategories
      where subcategory_id = ${id}
    `

    if (count > 0) {
      throw new BadRequestException(
        'No puedes eliminar una subcategoria que contiene productos.',
      )
    }

    await this.database.sql`delete from public.subcategories where id = ${id}`
    return { deleted: true }
  }

  async deleteCategory(id: string) {
    const [{ count }] = await this.database.sql<{ count: number }[]>`
      select count(*)::int as count from public.products where category_id = ${id}
    `

    if (count > 0) {
      throw new BadRequestException(
        'No puedes eliminar una categoria que contiene productos.',
      )
    }

    await this.database.sql`delete from public.categories where id = ${id}`
    return { deleted: true }
  }

  async saveIntention(dto: IntentionDto, id?: string) {
    const intentionId = id ?? dto.id ?? dto.slug

    await this.database.sql`
      insert into public.intentions (
        id, slug, name, affirmation, description, ritual_prompt, icon, color,
        image_url, benefits, active, sort_order, seo
      )
      values (
        ${intentionId}, ${dto.slug}, ${dto.name}, ${dto.affirmation ?? ''},
        ${dto.description ?? ''}, ${dto.ritualPrompt ?? ''},
        ${dto.icon ?? 'sparkles'}, ${dto.color ?? '#8FA58C'}, ${dto.imageUrl ?? null},
        ${dto.benefits ?? []}, ${dto.active ?? true}, ${dto.sortOrder ?? 0},
        ${this.database.sql.json((dto.seo ?? {}) as never)}
      )
      on conflict (id) do update set
        slug = excluded.slug,
        name = excluded.name,
        affirmation = excluded.affirmation,
        description = excluded.description,
        ritual_prompt = excluded.ritual_prompt,
        image_url = excluded.image_url,
        icon = excluded.icon,
        color = excluded.color,
        benefits = excluded.benefits,
        active = excluded.active,
        sort_order = excluded.sort_order,
        seo = excluded.seo
    `

    return { id: intentionId }
  }

  async deleteIntention(id: string) {
    await this.database.sql`delete from public.intentions where id = ${id}`
    return { deleted: true }
  }

  async saveProduct(dto: ProductDto, id?: string) {
    const productId =
      id ?? dto.id ?? `prod-${dto.slug}-${randomUUID().slice(0, 8)}`

    await this.database.sql.begin(async (transaction) => {
      await transaction`
        insert into public.products (
          id, category_id, sku, slug, name, subtitle, short_description,
          description, price, compare_at_price, stock, status, featured,
          bestseller, is_new, tags, materials, ingredients, care_instructions,
          chakras, energetic_properties, zodiac_signs, dimensions, origin,
          ritual, sustainability, seo
        )
        values (
          ${productId}, ${dto.categoryId}, ${dto.sku}, ${dto.slug}, ${dto.name},
          ${dto.subtitle ?? ''}, ${dto.shortDescription ?? ''},
          ${dto.description ?? ''}, ${dto.price}, ${dto.compareAtPrice ?? null},
          ${dto.stock}, ${dto.status}, ${dto.featured ?? false},
          ${dto.bestseller ?? false}, ${dto.isNew ?? false}, ${dto.tags ?? []},
          ${dto.materials ?? []}, ${dto.ingredients ?? []},
          ${dto.careInstructions ?? []}, ${dto.chakras ?? []},
          ${dto.energeticProperties ?? []}, ${dto.zodiacSigns ?? []},
          ${transaction.json((dto.dimensions ?? {}) as never)},
          ${transaction.json((dto.origin ?? {}) as never)},
          ${transaction.json((dto.ritual ?? {}) as never)},
          ${transaction.json((dto.sustainability ?? {}) as never)},
          ${transaction.json((dto.seo ?? {}) as never)}
        )
        on conflict (id) do update set
          category_id = excluded.category_id,
          sku = excluded.sku,
          slug = excluded.slug,
          name = excluded.name,
          subtitle = excluded.subtitle,
          short_description = excluded.short_description,
          description = excluded.description,
          price = excluded.price,
          compare_at_price = excluded.compare_at_price,
          stock = excluded.stock,
          status = excluded.status,
          featured = excluded.featured,
          bestseller = excluded.bestseller,
          is_new = excluded.is_new,
          tags = excluded.tags,
          materials = excluded.materials,
          ingredients = excluded.ingredients,
          care_instructions = excluded.care_instructions,
          chakras = excluded.chakras,
          energetic_properties = excluded.energetic_properties,
          zodiac_signs = excluded.zodiac_signs,
          dimensions = excluded.dimensions,
          origin = excluded.origin,
          ritual = excluded.ritual,
          sustainability = excluded.sustainability,
          seo = excluded.seo
      `

      if (dto.intentionIds) {
        await transaction`
          delete from public.product_intentions where product_id = ${productId}
        `
        for (const intentionId of dto.intentionIds) {
          await transaction`
            insert into public.product_intentions (product_id, intention_id)
            values (${productId}, ${intentionId})
          `
        }
      }

      if (dto.subcategoryIds) {
        await transaction`
          delete from public.product_subcategories where product_id = ${productId}
        `
        for (const subcategoryId of dto.subcategoryIds) {
          await transaction`
            insert into public.product_subcategories (product_id, subcategory_id)
            values (${productId}, ${subcategoryId})
          `
        }
      }
    })

    return this.getProduct(productId, true)
  }

  async deleteProduct(id: string) {
    const [product] = await this.database.sql<{ id: string }[]>`
      update public.products
      set status = 'hidden'
      where id = ${id}
      returning id
    `

    if (!product) {
      throw new NotFoundException('Producto no encontrado.')
    }

    return this.getProduct(id, true)
  }
}
