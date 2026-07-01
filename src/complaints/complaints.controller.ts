import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { AdminRequest } from '../auth/admin.guard'
import { AdminGuard } from '../auth/admin.guard'
import {
  ComplaintsQueryDto,
  CreateComplaintDto,
  UpdateComplaintDto,
} from './complaints.dto'
import { ComplaintsService } from './complaints.service'

@Controller()
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Post('complaints')
  create(@Body() dto: CreateComplaintDto) {
    return this.complaints.create(dto)
  }

  @Get('admin/complaints')
  @UseGuards(AdminGuard)
  list(@Query() query: ComplaintsQueryDto) {
    return this.complaints.list(query)
  }

  @Patch('admin/complaints/:id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintDto,
    @Req() request: AdminRequest,
  ) {
    return this.complaints.update(id, dto, request.adminUser.id)
  }
}
