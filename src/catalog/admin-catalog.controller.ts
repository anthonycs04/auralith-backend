import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { MultipartFile } from '@fastify/multipart'
import type { FastifyRequest } from 'fastify'
import { AdminGuard } from '../auth/admin.guard'
import {
  BulkProductDto,
  CategoryDto,
  IntentionDto,
  ProductDto,
} from './catalog.dto'
import { CatalogService } from './catalog.service'
import { StorageService } from './storage.service'

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminCatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly storage: StorageService,
  ) {}

  @Get('products')
  products() {
    return this.catalog.listProducts({}, true)
  }

  @Get('products/:id')
  product(@Param('id') id: string) {
    return this.catalog.getProduct(id, true)
  }

  @Post('products')
  createProduct(@Body() dto: ProductDto) {
    return this.catalog.saveProduct(dto)
  }

  @Put('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: ProductDto) {
    return this.catalog.saveProduct(dto, id)
  }

  @Patch('products/bulk')
  async bulkProducts(@Body() dto: BulkProductDto) {
    const products = []
    for (const product of dto.products) {
      products.push(await this.catalog.saveProduct(product, product.id))
    }
    return products
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.catalog.deleteProduct(id)
  }

  @Post('products/:id/images')
  async uploadImage(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ) {
    const file = (await request.file()) as MultipartFile | undefined

    if (!file) {
      throw new BadRequestException('No se recibio ningun archivo.')
    }

    return this.storage.uploadProductImage(id, file)
  }

  @Delete('product-images/:imageId')
  deleteImage(@Param('imageId') imageId: string) {
    return this.storage.deleteProductImage(imageId)
  }

  @Get('categories')
  categories() {
    return this.catalog.listCategories(true)
  }

  @Post('categories')
  createCategory(@Body() dto: CategoryDto) {
    return this.catalog.saveCategory(dto)
  }

  @Post('categories/:id/image')
  async uploadCategoryImage(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ) {
    const file = (await request.file()) as MultipartFile | undefined

    if (!file) {
      throw new BadRequestException('No se recibio ningun archivo.')
    }

    return this.storage.uploadCategoryImage(id, file)
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: CategoryDto) {
    return this.catalog.saveCategory(dto, id)
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.catalog.deleteCategory(id)
  }

  @Get('intentions')
  intentions() {
    return this.catalog.listIntentions(true)
  }

  @Post('intentions')
  createIntention(@Body() dto: IntentionDto) {
    return this.catalog.saveIntention(dto)
  }

  @Put('intentions/:id')
  updateIntention(@Param('id') id: string, @Body() dto: IntentionDto) {
    return this.catalog.saveIntention(dto, id)
  }

  @Delete('intentions/:id')
  deleteIntention(@Param('id') id: string) {
    return this.catalog.deleteIntention(id)
  }
}
