import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { DatabaseService } from '../database/database.service'
import type { UpdateContentDto } from './content.dto'

const defaultSettings = {
  heroPrimaryButton: '',
  heroSecondaryButton: '',
  heroText: '',
  instagramHandle: '',
  schedule: '',
  storyText: '',
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
  whatsappNumber: '',
}

@Injectable()
export class ContentService {
  constructor(private readonly database: DatabaseService) {}

  async get() {
    const [settings] = await this.database.sql<
      { value: Record<string, unknown> }[]
    >`
      select value from public.site_content where key = 'settings'
    `
    const faqs = await this.database.sql`
      select id, question, answer, active
      from public.faqs
      where active
      order by sort_order, created_at
    `

    return {
      ...defaultSettings,
      ...(settings?.value ?? {}),
      faqs,
    }
  }

  async update(dto: UpdateContentDto, actorId: string) {
    const { faqs, ...settings } = dto
    const settingsPayload = settings as unknown as Record<string, unknown>

    await this.database.sql.begin(async (transaction) => {
      await transaction`
        insert into public.site_content (key, value, updated_by)
        values ('settings', ${transaction.json(settingsPayload as never)}, ${actorId})
        on conflict (key) do update set
          value = excluded.value,
          updated_by = excluded.updated_by,
          updated_at = now()
      `

      const ids = faqs.map((faq) => faq.id ?? randomUUID())
      await transaction`
        update public.faqs
        set active = false
        where not (id = any(${ids}::uuid[]))
      `

      for (const [index, faq] of faqs.entries()) {
        const id = faq.id ?? ids[index]
        await transaction`
          insert into public.faqs (id, question, answer, sort_order, active)
          values (
            ${id}, ${faq.question}, ${faq.answer}, ${index + 1},
            ${faq.active ?? true}
          )
          on conflict (id) do update set
            question = excluded.question,
            answer = excluded.answer,
            sort_order = excluded.sort_order,
            active = excluded.active
        `
      }

      await transaction`
        insert into public.audit_logs (
          actor_id, action, entity_type, entity_id
        )
        values (${actorId}, 'content.updated', 'site_content', 'settings')
      `
    })

    return this.get()
  }
}
