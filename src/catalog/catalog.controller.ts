import { Controller, Get, Param, Query } from '@nestjs/common'
import { CatalogQueryDto } from './catalog.dto'
import { CatalogService } from './catalog.service'

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products')
  products(@Query() query: CatalogQueryDto) {
    return this.catalog.listProducts(query)
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string) {
    return this.catalog.getProduct(slug)
  }

  @Get('categories')
  categories() {
    return this.catalog.listCategories()
  }

  @Get('intentions')
  intentions() {
    return this.catalog.listIntentions()
  }
}
