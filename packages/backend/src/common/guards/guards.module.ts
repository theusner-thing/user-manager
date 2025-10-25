import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { CanEditUserGuard } from './can-edit-user.guard';

@Module({
  providers: [AdminGuard, CanEditUserGuard],
  exports: [AdminGuard, CanEditUserGuard],
})
export class GuardsModule {}
