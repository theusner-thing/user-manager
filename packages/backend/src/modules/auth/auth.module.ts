import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from "../users/users.module";
import { SharedModule } from "../shared/shared.module";
import { GuardsModule } from '../../common/guards/guards.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'changeme', signOptions: { expiresIn: '1h' } }),
    UsersModule,
    SharedModule,
    GuardsModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
