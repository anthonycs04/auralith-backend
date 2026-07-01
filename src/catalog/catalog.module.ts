import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminCatalogController } from './admin-catalog.controller'
import { CatalogController } from './catalog.controller'
import { CatalogService } from './catalog.service'
import { StorageService } from './storage.service'

@Module({
  controllers: [CatalogController, AdminCatalogController],
  exports: [CatalogService],
  imports: [AuthModule],
  providers: [CatalogService, StorageService],
})
export class CatalogModule {}
