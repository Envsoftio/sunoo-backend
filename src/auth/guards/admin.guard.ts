import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Allow both admin and superadmin roles
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
