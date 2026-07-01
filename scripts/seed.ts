import { categories, intentions, products } from '../../src/data'
import { createDatabaseClient } from './db'

const siteSettings = {
  heroPrimaryButton: 'Explorar tienda',
  heroSecondaryButton: 'Comprar por intencion',
  heroText: 'Productos holisticos para armonizar tu energia',
  instagramHandle: '@auralith.pe',
  schedule: 'Lunes a sabado, 10:00 a 19:00',
  storyText:
    'Auralith cura piezas holisticas con sensibilidad peruana, materiales nobles y rituales simples para la vida diaria.',
  testimonials: [
    {
      author: 'Maria Fernanda',
      id: 'testimonial-maria-fernanda',
      quote:
        'El set de luna nueva llego precioso. Se siente curado con muchisimo cuidado.',
    },
    {
      author: 'Camila R.',
      id: 'testimonial-camila-r',
      quote:
        'La bruma Munay cambio mi rutina de cierre del dia. Suave, elegante y nada invasiva.',
    },
    {
      author: 'Valeria S.',
      id: 'testimonial-valeria-s',
      quote:
        'Compre por intencion y fue facilisimo encontrar algo que realmente conectara conmigo.',
    },
  ],
  whatsappNumber: '+51 999 999 999',
}

const faqs = [
  {
    answer:
      'Coordinamos cada pedido por WhatsApp antes de confirmar el pago y el envio.',
    id: '4a1ad861-31c6-4f60-a42c-bf759c23e501',
    question: 'Como compro en Auralith?',
  },
  {
    answer:
      'Si. Trabajamos con Flores, Shalom, Olva Courier y Marvisur, ademas de recojo en tienda.',
    id: '4a1ad861-31c6-4f60-a42c-bf759c23e502',
    question: 'Hacen envios a todo el Peru?',
  },
  {
    answer:
      'Cada pieza incluye una guia breve para limpiar, usar y conservar su energia.',
    id: '4a1ad861-31c6-4f60-a42c-bf759c23e503',
    question: 'Como cuido mis productos?',
  },
]

async function main() {
  const sql = createDatabaseClient()

  try {
    await sql.begin(async (transaction) => {
    for (const category of categories) {
      await transaction`
        insert into public.categories (
          id, slug, name, short_name, description, hero_copy, image_url,
          accent_color, featured, active, sort_order, seo
        )
        values (
          ${category.id}, ${category.slug}, ${category.name},
          ${category.shortName}, ${category.description}, ${category.heroCopy},
          ${category.image}, ${category.accentColor}, ${category.featured},
          true, ${category.sortOrder}, ${transaction.json(category.seo)}
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
          sort_order = excluded.sort_order,
          seo = excluded.seo,
          updated_at = now()
      `
    }

    for (const intention of intentions) {
      await transaction`
        insert into public.intentions (
          id, slug, name, affirmation, description, ritual_prompt, icon,
          color, benefits, active, sort_order, seo
        )
        values (
          ${intention.id}, ${intention.slug}, ${intention.name},
          ${intention.affirmation}, ${intention.description},
          ${intention.ritualPrompt}, ${intention.icon}, ${intention.color},
          ${intention.benefits}, true, ${intention.sortOrder},
          ${transaction.json(intention.seo)}
        )
        on conflict (id) do update set
          slug = excluded.slug,
          name = excluded.name,
          affirmation = excluded.affirmation,
          description = excluded.description,
          ritual_prompt = excluded.ritual_prompt,
          icon = excluded.icon,
          color = excluded.color,
          benefits = excluded.benefits,
          sort_order = excluded.sort_order,
          seo = excluded.seo,
          updated_at = now()
      `
    }

    await transaction`delete from public.category_intentions`

    for (const category of categories) {
      for (const intentionId of category.intentionIds) {
        await transaction`
          insert into public.category_intentions (category_id, intention_id)
          values (${category.id}, ${intentionId})
          on conflict do nothing
        `
      }
    }

    for (const product of products) {
      await transaction`
        insert into public.products (
          id, category_id, sku, slug, name, subtitle, short_description,
          description, price, compare_at_price, currency, stock, status,
          featured, bestseller, is_new, tags, materials, ingredients,
          care_instructions, chakras, energetic_properties, zodiac_signs,
          dimensions, origin, ritual, sustainability, seo
        )
        values (
          ${product.id}, ${product.categoryId}, ${product.sku}, ${product.slug},
          ${product.name}, ${product.subtitle}, ${product.shortDescription},
          ${product.description}, ${product.price}, ${product.compareAtPrice},
          ${product.currency}, ${product.stock}, ${product.status},
          ${product.featured}, ${product.bestseller}, ${product.isNew},
          ${product.tags}, ${product.materials}, ${product.ingredients},
          ${product.careInstructions}, ${product.chakras},
          ${product.energeticProperties}, ${product.zodiacSigns},
          ${transaction.json(product.dimensions)},
          ${transaction.json(product.origin)},
          ${transaction.json(product.ritual)},
          ${transaction.json(product.sustainability)},
          ${transaction.json(product.seo)}
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
          currency = excluded.currency,
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
          seo = excluded.seo,
          updated_at = now()
      `

      await transaction`
        delete from public.product_intentions where product_id = ${product.id}
      `

      for (const intentionId of product.intentionIds) {
        await transaction`
          insert into public.product_intentions (product_id, intention_id)
          values (${product.id}, ${intentionId})
          on conflict do nothing
        `
      }

      await transaction`
        delete from public.product_images
        where product_id = ${product.id} and storage_path is null
      `

      for (const [index, image] of product.images.entries()) {
        await transaction`
          insert into public.product_images (
            product_id, public_url, alt_text, width, height, sort_order, is_primary
          )
          values (
            ${product.id}, ${image.src}, ${image.alt}, ${image.width},
            ${image.height}, ${index}, ${image.isPrimary}
          )
        `
      }
    }

    await transaction`
      insert into public.site_content (key, value)
      values ('settings', ${transaction.json(siteSettings)})
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `

    for (const [index, faq] of faqs.entries()) {
      await transaction`
        insert into public.faqs (id, question, answer, sort_order, active)
        values (${faq.id}, ${faq.question}, ${faq.answer}, ${index + 1}, true)
        on conflict (id) do update set
          question = excluded.question,
          answer = excluded.answer,
          sort_order = excluded.sort_order,
          active = true,
          updated_at = now()
      `
    }
    })

    console.log(
      `Seed ready: ${products.length} products, ${categories.length} categories, ${intentions.length} intentions`,
    )
  } finally {
    await sql.end()
  }
}

void main()
