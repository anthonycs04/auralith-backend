import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { createDatabaseClient } from './db'

const apiUrl = process.env.SMOKE_API_URL ?? 'http://127.0.0.1:3001/api'
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son requeridos.')
}

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<T> {
  const headers = new Headers(init?.headers)

  if (init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${apiUrl}${path}`, { ...init, headers })
  if (!response.ok) {
    throw new Error(
      `${init?.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`,
    )
  }

  return response.json() as Promise<T>
}

async function main() {
  const sql = createDatabaseClient()
  let testOrderId: string | null = null
  let complaintCode: string | null = null

  try {
    const health = await request<{ status: string }>('/health/database')
    const products = await request<
      Array<{ id: string; stock: number }>
    >('/catalog/products')
    const categories = await request<unknown[]>('/catalog/categories')
    const intentions = await request<unknown[]>('/catalog/intentions')
    const product = products.find((item) => item.stock >= 3)

    if (!product) {
      throw new Error('No hay producto con stock suficiente para la prueba.')
    }

    const login = await request<{
      accessToken: string
      user: { email: string }
    }>('/auth/login', {
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      method: 'POST',
    })
    const token = login.accessToken
    const me = await request<{ email: string }>('/auth/me', undefined, token)
    await request('/admin/dashboard', undefined, token)

    const order = await request<{ id: string; total: number }>(
      '/admin/orders',
      {
        body: JSON.stringify({
          city: 'Lima',
          customerName: 'Prueba automatizada',
          items: [{ productId: product.id, quantity: 1 }],
          shippingMethod: 'Recojo en tienda',
          source: 'tiktok',
          whatsapp: '51900000000',
        }),
        method: 'POST',
      },
      token,
    )
    testOrderId = order.id

    const afterCreate = await request<{ stock: number }>(
      `/admin/products/${product.id}`,
      undefined,
      token,
    )
    if (afterCreate.stock !== product.stock - 1) {
      throw new Error('La creacion del pedido no desconto el stock esperado.')
    }

    await request(
      `/admin/orders/${order.id}/items`,
      {
        body: JSON.stringify({
          items: [{ productId: product.id, quantity: 2 }],
        }),
        method: 'PATCH',
      },
      token,
    )
    const afterEdit = await request<{ stock: number }>(
      `/admin/products/${product.id}`,
      undefined,
      token,
    )
    if (afterEdit.stock !== product.stock - 2) {
      throw new Error('La edicion del pedido no recalculo el stock esperado.')
    }

    const pdfResponse = await fetch(
      `${apiUrl}/admin/orders/${order.id}/shipping-label.pdf`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const pdfBytes = await pdfResponse.arrayBuffer()
    if (
      !pdfResponse.ok ||
      pdfResponse.headers.get('content-type') !== 'application/pdf' ||
      pdfBytes.byteLength < 500
    ) {
      throw new Error('La etiqueta PDF no se genero correctamente.')
    }

    await request(
      `/admin/orders/${order.id}/status`,
      {
        body: JSON.stringify({ status: 'cancelled' }),
        method: 'PATCH',
      },
      token,
    )
    const afterCancel = await request<{ stock: number }>(
      `/admin/products/${product.id}`,
      undefined,
      token,
    )
    if (afterCancel.stock !== product.stock) {
      throw new Error('La cancelacion no repuso el stock original.')
    }

    const imageForm = new FormData()
    const onePixelPng = Uint8Array.from(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    )
    imageForm.set(
      'file',
      new Blob([onePixelPng], { type: 'image/png' }),
      'smoke-test.png',
    )
    const image = await request<{ id: string; src: string }>(
      `/admin/products/${product.id}/images`,
      { body: imageForm, method: 'POST' },
      token,
    )
    if (!image.src.includes('product-images')) {
      throw new Error('Storage no devolvio una URL publica valida.')
    }
    await request(
      `/admin/product-images/${image.id}`,
      { method: 'DELETE' },
      token,
    )

    const complaint = await request<{ code: string }>(
      '/complaints',
      {
        body: JSON.stringify({
          detail: 'Registro de prueba automatizada para validar el flujo.',
          document: '00000000',
          email: 'smoke@example.com',
          fullName: 'Prueba automatizada',
          phone: '900000000',
          request: 'Eliminar despues de validar.',
          type: 'reclamo',
        }),
        method: 'POST',
      },
    )
    complaintCode = complaint.code

    console.log(
      JSON.stringify({
        admin: me.email,
        catalog: {
          categories: categories.length,
          intentions: intentions.length,
          products: products.length,
        },
        database: health.status,
        orderFlow: 'create/edit/pdf/cancel ok',
        storage: 'upload/delete ok',
      }),
    )
  } finally {
    const smokeImages = await sql<{ id: string; storage_path: string | null }[]>`
      select id, storage_path
      from public.product_images
      where alt_text = 'smoke-test.png'
    `
    const storagePaths = smokeImages
      .map((image) => image.storage_path)
      .filter((path): path is string => Boolean(path))

    if (
      storagePaths.length &&
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SECRET_KEY
    ) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
      await supabase.storage
        .from(process.env.SUPABASE_PRODUCT_IMAGES_BUCKET ?? 'product-images')
        .remove(storagePaths)
    }

    await sql`
      delete from public.product_images where alt_text = 'smoke-test.png'
    `

    if (testOrderId) {
      await sql.begin(async (transaction) => {
        await transaction`
          delete from public.audit_logs
          where entity_type = 'order' and entity_id = ${testOrderId}
        `
        await transaction`
          delete from public.inventory_movements where order_id = ${testOrderId}
        `
        await transaction`delete from public.orders where id = ${testOrderId}`
      })
    }

    if (complaintCode) {
      await sql`delete from public.complaints where code = ${complaintCode}`
    }

    await sql.end()
  }
}

void main()
