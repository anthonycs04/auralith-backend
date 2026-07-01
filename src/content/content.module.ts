import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ContentController } from './content.controller'
import { ContentService } from './content.service'

@Module({
  controllers: [ContentController],
  imports: [AuthModule],
  providers: [ContentService],
})
export class ContentModule {}
