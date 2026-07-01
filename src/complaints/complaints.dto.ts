import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'

export class CreateComplaintDto {
  @IsIn(['queja', 'reclamo'])
  type!: 'queja' | 'reclamo'

  @IsString()
  @MinLength(3)
  fullName!: string

  @IsString()
  document!: string

  @IsEmail()
  email!: string

  @IsString()
  phone!: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  orderCode?: string

  @IsString()
  @MinLength(10)
  detail!: string

  @IsString()
  @MinLength(3)
  request!: string
}

export class ComplaintsQueryDto {
  @IsOptional()
  @IsIn(['received', 'in_review', 'resolved', 'closed'])
  status?: string
}

export class UpdateComplaintDto {
  @IsIn(['received', 'in_review', 'resolved', 'closed'])
  status!: string

  @IsOptional()
  @IsString()
  response?: string
}
