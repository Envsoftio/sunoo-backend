import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggerGuard implements CanActivate {
  constructor(private readonly loggerService: LoggerService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const _userAgent = request.get('User-Agent') || '';

    // Log all requests (even those that might be blocked)
    this.loggerService.log(
      `Request: ${method} ${url} from ${ip}`,
      'LoggerGuard'
    );

    return true; // Always allow, just for logging
  }
}
