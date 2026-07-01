import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator'

export class FaqDto {
  @IsOptional()
  @IsUUID()
  id?: string

  @IsString()
  question!: string

  @IsString()
  answer!: string

  @IsOptional()
  @IsBoolean()
  active?: boolean
}

export class TestimonialDto {
  @IsOptional()
  @IsString()
  id?: string

  @IsString()
  author!: string

  @IsString()
  quote!: string
}

export class UpdateContentDto {
  @IsString()
  heroPrimaryButton!: string

  @IsString()
  heroSecondaryButton!: string

  @IsString()
  heroText!: string

  @IsString()
  instagramHandle!: string

  @IsString()
  schedule!: string

  @IsString()
  storyText!: string

  @IsString()
  whatsappNumber!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqDto)
  faqs!: FaqDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestimonialDto)
  testimonials!: TestimonialDto[]
}
