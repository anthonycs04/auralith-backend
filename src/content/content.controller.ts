import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common'
import type { AdminRequest } from '../auth/admin.guard'
import { AdminGuard } from '../auth/admin.guard'
import { UpdateContentDto } from './content.dto'
import { ContentService } from './content.service'

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('content')
  getPublicContent() {
    return this.content.get()
  }

  @Get('admin/content')
  @UseGuards(AdminGuard)
  getAdminContent() {
    return this.content.get()
  }

  @Put('admin/content')
  @UseGuards(AdminGuard)
  update(
    @Body() dto: UpdateContentDto,
    @Req() request: AdminRequest,
  ) {
    return this.content.update(dto, request.adminUser.id)
  }
}
