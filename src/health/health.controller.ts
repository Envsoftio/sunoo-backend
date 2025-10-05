import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService, HealthStatus } from './health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Simple health check' })
  @ApiResponse({
    status: 200,
    description: 'Basic health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        uptimeFormatted: { type: 'string', example: '1 hour' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  getHealth() {
    return this.healthService.getSimpleHealth();
  }

  @Get('detailed')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Detailed health check with system metrics (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive health status with system metrics',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
        version: { type: 'string' },
        environment: { type: 'string' },
        services: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down', 'degraded'] },
                responseTime: { type: 'number' },
                responseTimeFormatted: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
            memory: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down', 'degraded'] },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
            disk: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down', 'degraded'] },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
          },
        },
        system: {
          type: 'object',
          properties: {
            nodeVersion: { type: 'string' },
            platform: { type: 'string' },
            arch: { type: 'string' },
            cpuUsage: { type: 'number' },
            cpuUsageFormatted: { type: 'string' },
            memoryUsage: {
              type: 'object',
              properties: {
                used: { type: 'number' },
                total: { type: 'number' },
                percentage: { type: 'number' },
                usedFormatted: { type: 'string' },
                totalFormatted: { type: 'string' },
                percentageFormatted: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  async getDetailedHealth(): Promise<HealthStatus> {
    return this.healthService.getHealthStatus();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes/Docker' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept traffic',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ready' },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  async getReadiness(@Res() res: Response) {
    try {
      const health = await this.healthService.getHealthStatus();

      if (health.status === 'healthy') {
        return res.status(HttpStatus.OK).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
        });
      }

      // Return 503 status for not ready
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: health.status,
        services: health.services,
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes/Docker' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'alive' },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
      },
    },
  })
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
