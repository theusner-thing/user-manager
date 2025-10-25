import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import ormconfig from './ormconfig';

@Module({
  imports: [TypeOrmModule.forRoot(ormconfig as any), UsersModule, AuthModule],
})
export class AppModule {}
