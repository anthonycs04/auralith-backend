import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import type { MultipartFile } from '@fastify/multipart'
import sharp from 'sharp'
import { DatabaseService } from '../database/database.service'
import { SupabaseService } from '../supabase/supabase.service'

const MAX_PRODUCT_IMAGE_DIMENSION = 1800
const PRODUCT_IMAGE_QUALITY = 78

@Injectable()
export class StorageService {
  private readonly bucket: string

  constructor(
    config: ConfigService,
    private readonly database: DatabaseService,
    private readonly supabase: SupabaseService,
  ) {
    this.bucket = config.getOrThrow<string>('SUPABASE_PRODUCT_IMAGES_BUCKET')
  }

  private async compressImage(file: MultipartFile) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Solo se permiten archivos de imagen.')
    }

    const originalBuffer = await file.toBuffer()
    const compressedBuffer = await sharp(originalBuffer, {
      failOn: 'none',
    })
      .rotate()
      .resize({
        fit: 'inside',
        height: MAX_PRODUCT_IMAGE_DIMENSION,
        withoutEnlargement: true,
        width: MAX_PRODUCT_IMAGE_DIMENSION,
      })
      .webp({ effort: 4, quality: PRODUCT_IMAGE_QUALITY })
      .toBuffer()
    const metadata = await sharp(compressedBuffer).metadata()

    return { buffer: compressedBuffer, metadata }
  }

  async uploadProductImage(productId: string, file: MultipartFile) {
    const { buffer, metadata } = await this.compressImage(file)
    const path = `products/${productId}/${randomUUID()}.webp`
    const { error } = await this.supabase.admin.storage
      .from(this.bucket)
      .upload(path, buffer, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: false,
      })

    if (error) {
      throw new BadRequestException(`No se pudo subir la imagen: ${error.message}`)
    }

    const {
      data: { publicUrl },
    } = this.supabase.admin.storage.from(this.bucket).getPublicUrl(path)
    const [{ count }] = await this.database.sql<{ count: number }[]>`
      select count(*)::int as count
      from public.product_images
      where product_id = ${productId}
    `
    const [image] = await this.database.sql`
      insert into public.product_images (
        product_id, storage_path, public_url, alt_text, sort_order, is_primary,
        width, height
      )
      values (
        ${productId}, ${path}, ${publicUrl}, ${file.filename}, ${count},
        ${count === 0}, ${metadata.width ?? null}, ${metadata.height ?? null}
      )
      returning
        id,
        public_url as "src",
        alt_text as "altText",
        sort_order as "sortOrder",
        is_primary as "isPrimary"
    `

    return image
  }

  async uploadCategoryImage(categoryId: string, file: MultipartFile) {
    const [category] = await this.database.sql<{ id: string }[]>`
      select id from public.categories where id = ${categoryId}
    `

    if (!category) {
      throw new NotFoundException('Categoria no encontrada.')
    }

    const { buffer, metadata } = await this.compressImage(file)
    const path = `categories/${categoryId}/${randomUUID()}.webp`
    const { error } = await this.supabase.admin.storage
      .from(this.bucket)
      .upload(path, buffer, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: false,
      })

    if (error) {
      throw new BadRequestException(`No se pudo subir la imagen: ${error.message}`)
    }

    const {
      data: { publicUrl },
    } = this.supabase.admin.storage.from(this.bucket).getPublicUrl(path)

    const [updatedCategory] = await this.database.sql`
      update public.categories
      set image_url = ${publicUrl}, updated_at = now()
      where id = ${categoryId}
      returning
        id,
        image_url as "imageUrl",
        ${path} as "storagePath",
        ${metadata.width ?? null} as width,
        ${metadata.height ?? null} as height
    `

    return updatedCategory
  }

  async deleteProductImage(imageId: string) {
    const [image] = await this.database.sql<
      { storage_path: string | null }[]
    >`
      select storage_path from public.product_images where id = ${imageId}
    `

    if (!image) {
      throw new NotFoundException('Imagen no encontrada.')
    }

    if (image.storage_path) {
      const { error } = await this.supabase.admin.storage
        .from(this.bucket)
        .remove([image.storage_path])

      if (error) {
        throw new BadRequestException(
          `No se pudo eliminar la imagen: ${error.message}`,
        )
      }
    }

    await this.database.sql`delete from public.product_images where id = ${imageId}`
    return { deleted: true }
  }
}
