import { Injectable, NotFoundException } from '@nestjs/common'
import { randomInt } from 'node:crypto'
import { DatabaseService } from '../database/database.service'
import type {
  CreateComplaintDto,
  ComplaintsQueryDto,
  UpdateComplaintDto,
} from './complaints.dto'

@Injectable()
export class ComplaintsService {
  constructor(private readonly database: DatabaseService) {}

  async create(dto: CreateComplaintDto) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const code = `LR-${date}-${randomInt(1000, 9999)}`
    const [complaint] = await this.database.sql`
      insert into public.complaints (
        code, type, name, document, email, phone, address, order_code, detail,
        request
      )
      values (
        ${code}, ${dto.type}, ${dto.fullName}, ${dto.document}, ${dto.email},
        ${dto.phone}, ${dto.address ?? null}, ${dto.orderCode ?? null},
        ${dto.detail}, ${dto.request}
      )
      returning code, status, created_at as "createdAt"
    `

    return complaint
  }

  list(query: ComplaintsQueryDto) {
    return this.database.sql`
      select
        id, code, type, name, document, email, phone, address,
        order_code as "orderCode", detail, request, status, response,
        created_at as "createdAt", updated_at as "updatedAt"
      from public.complaints
      where ${query.status ?? null}::text is null or status = ${query.status ?? null}
      order by created_at desc
    `
  }

  async update(id: string, dto: UpdateComplaintDto, actorId: string) {
    const [complaint] = await this.database.sql`
      update public.complaints
      set status = ${dto.status}, response = ${dto.response ?? null}
      where id = ${id}
      returning id, code, status, response, updated_at as "updatedAt"
    `

    if (!complaint) {
      throw new NotFoundException('Solicitud no encontrada.')
    }

    await this.database.sql`
      insert into public.audit_logs (
        actor_id, action, entity_type, entity_id, metadata
      )
      values (
        ${actorId}, 'complaint.updated', 'complaint', ${id},
        ${this.database.sql.json({ status: dto.status })}
      )
    `

    return complaint
  }
}
