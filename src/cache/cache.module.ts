import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { CacheAdminController } from './cache-admin.controller';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [CacheAdminController],
  providers: [
    CacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [CacheService],
})
export class CacheModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly cacheService: CacheService) {}

  async onModuleInit() {
    await this.cacheService.connect();
  }

  async onModuleDestroy() {
    await this.cacheService.disconnect();
  }
}
