import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from './database.service';

@ApiTags('Database')
@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('test')
  @ApiOperation({ summary: 'Test database connection' })
  @ApiResponse({ 
    status: 200, 
    description: 'Database connection test result',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'connected' },
        message: { type: 'string', example: 'Database connection successful' },
        database: { type: 'string', example: 'sunoo_backend' },
        host: { type: 'string', example: 'localhost' },
        port: { type: 'number', example: 5432 },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' }
      }
    }
  })
  async testConnection() {
    return this.databaseService.testConnection();
  }

  @Get('tables')
  @ApiOperation({ summary: 'Get database tables information' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of database tables',
    schema: {
      type: 'object',
      properties: {
        tables: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              table_name: { type: 'string' },
              table_type: { type: 'string' }
            }
          }
        },
        count: { type: 'number' }
      }
    }
  })
  async getTables() {
    return this.databaseService.getTableInfo();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get database statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Database statistics',
    schema: {
      type: 'object',
      properties: {
        totalTables: { type: 'number' },
        totalConnections: { type: 'number' },
        databaseSize: { type: 'string' },
        uptime: { type: 'string' }
      }
    }
  })
  async getStats() {
    return this.databaseService.getDatabaseStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Comprehensive database health check' })
  @ApiResponse({ 
    status: 200, 
    description: 'Complete database health status'
  })
  async getHealth() {
    const [connection, tables, stats] = await Promise.allSettled([
      this.databaseService.testConnection(),
      this.databaseService.getTableInfo(),
      this.databaseService.getDatabaseStats(),
    ]);

    return {
      connection: connection.status === 'fulfilled' ? connection.value : { error: connection.reason },
      tables: tables.status === 'fulfilled' ? tables.value : { error: tables.reason },
      stats: stats.status === 'fulfilled' ? stats.value : { error: stats.reason },
      overall: connection.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}
