import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import type { AdminRequest } from './admin.guard'
import { AdminGuard } from './admin.guard'
import { LoginDto } from './auth.dto'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@Req() request: AdminRequest) {
    return request.adminUser
  }
}
