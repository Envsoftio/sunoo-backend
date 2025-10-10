import { Injectable } from '@nestjs/common';
import { Logger, QueryRunner } from 'typeorm';
import { LoggerService } from './logger.service';

@Injectable()
export class DatabaseLoggerService implements Logger {
  constructor(private readonly loggerService: LoggerService) {}

  // TypeORM Logger interface methods
  logQuery(query: string, _parameters?: any[], _queryRunner?: QueryRunner) {
    this.loggerService.log(`Database Query: ${query}`, 'DatabaseLogger');
  }

  logQueryError(
    error: string,
    _query: string,
    _parameters?: any[],
    _queryRunner?: QueryRunner
  ) {
    this.loggerService.error(
      `Database Query Error: ${error}`,
      error,
      'DatabaseLogger'
    );
  }

  logQuerySlow(
    time: number,
    query: string,
    _parameters?: any[],
    _queryRunner?: QueryRunner
  ) {
    this.loggerService.warn(
      `Slow Database Query: ${query} (${time}ms)`,
      'DatabaseLogger'
    );
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
    this.loggerService.log(`Database Schema: ${message}`, 'DatabaseLogger');
  }

  logMigration(message: string, _queryRunner?: QueryRunner) {
    this.loggerService.log(`Database Migration: ${message}`, 'DatabaseLogger');
  }

  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    _queryRunner?: QueryRunner
  ) {
    this.loggerService.log(`Database ${level}: ${message}`, 'DatabaseLogger');
  }
}
