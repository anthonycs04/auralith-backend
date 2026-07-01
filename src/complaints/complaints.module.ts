import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ComplaintsController } from './complaints.controller'
import { ComplaintsService } from './complaints.service'

@Module({
  controllers: [ComplaintsController],
  imports: [AuthModule],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}
