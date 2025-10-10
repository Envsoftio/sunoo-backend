import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DatabaseLoggerService } from '../common/logger/database-logger.service';

export const getDatabaseConfig = (
  configService: ConfigService,
  databaseLogger?: DatabaseLoggerService
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'password'),
  database: configService.get('DB_NAME', 'sunooapp'),
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false, // Disabled to prevent TypeORM from modifying existing schema
  logging: databaseLogger
    ? ['query', 'error', 'schema', 'warn', 'info', 'log', 'migration']
    : false,
  logger: databaseLogger ? (databaseLogger as any) : 'advanced-console',
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
  // Temporarily disable naming strategy to test
  // namingStrategy: new SnakeNamingStrategy(),
});
