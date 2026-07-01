import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  categoria?: string

  @IsOptional()
  @IsString()
  intencion?: string

  @IsOptional()
  @IsString()
  buscar?: string

  @IsOptional()
  @IsIn(['featured', 'newest', 'price-asc', 'price-desc'])
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc'
}

export class CategoryDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsString()
  slug!: string

  @IsString()
  name!: string

  @IsString()
  shortName!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  heroCopy?: string

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsString()
  accentColor?: string

  @IsOptional()
  @IsBoolean()
  featured?: boolean

  @IsOptional()
  @IsBoolean()
  active?: boolean

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  intentionIds?: string[]

  @IsOptional()
  @IsObject()
  seo?: Record<string, unknown>
}

export class IntentionDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsString()
  slug!: string

  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  affirmation?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  ritualPrompt?: string

  @IsOptional()
  @IsString()
  icon?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[]

  @IsOptional()
  @IsBoolean()
  active?: boolean

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsObject()
  seo?: Record<string, unknown>
}

export class ProductDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsString()
  categoryId!: string

  @IsString()
  sku!: string

  @IsString()
  slug!: string

  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  subtitle?: string

  @IsOptional()
  @IsString()
  shortDescription?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsNumber()
  @Min(0)
  price!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number | null

  @IsInt()
  @Min(0)
  stock!: number

  @IsIn(['available', 'low-stock', 'sold-out', 'preorder', 'draft', 'hidden'])
  status!: string

  @IsOptional()
  @IsBoolean()
  featured?: boolean

  @IsOptional()
  @IsBoolean()
  bestseller?: boolean

  @IsOptional()
  @IsBoolean()
  isNew?: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  careInstructions?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chakras?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  energeticProperties?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zodiacSigns?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  intentionIds?: string[]

  @IsOptional()
  @IsObject()
  dimensions?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  origin?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  ritual?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  sustainability?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  seo?: Record<string, unknown>
}

export class BulkProductDto {
  @IsArray()
  products!: ProductDto[]
}
