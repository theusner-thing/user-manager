import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CanEditUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as any;
    const id = req.params?.id;

    if (!user) throw new ForbiddenException();

    const isAdmin = user.role === 'admin';
    const isSelf = String(user.id) === String(id);
    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('Not allowed to update this user');
    }

    return true;
  }
}
