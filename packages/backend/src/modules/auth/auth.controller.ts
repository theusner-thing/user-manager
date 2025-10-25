import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      return { status: 'error', message: 'Invalid credentials' };
    }
    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    const result = await this.authService.refresh(body.refresh_token);
    if (!result) {
      return { status: 'error', message: 'Invalid refresh token' };
    }
    return result;
  }
}
