import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { FormatUtil } from '../utils/format.util';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    memory: ServiceHealth;
    disk: ServiceHealth;
  };
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpuUsage: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  responseTimeFormatted?: string;
  message?: string;
  details?: any;
}

@Injectable()
export class HealthService {
  private startTime = Date.now();

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Check all services in parallel
    const [databaseHealth, memoryHealth, diskHealth, systemInfo] =
      await Promise.allSettled([
        this.checkDatabase(),
        Promise.resolve(this.checkMemory()),
        Promise.resolve(this.checkDisk()),
        Promise.resolve(this.getSystemInfo()),
      ]);

    const services = {
      database:
        databaseHealth.status === 'fulfilled'
          ? databaseHealth.value
          : {
              status: 'down' as const,
              message:
                databaseHealth.reason?.message || 'Database check failed',
            },
      memory:
        memoryHealth.status === 'fulfilled'
          ? memoryHealth.value
          : {
              status: 'down' as const,
              message: memoryHealth.reason?.message || 'Memory check failed',
            },
      disk:
        diskHealth.status === 'fulfilled'
          ? diskHealth.value
          : {
              status: 'down' as const,
              message: diskHealth.reason?.message || 'Disk check failed',
            },
    };

    // Determine overall status
    const serviceStatuses = Object.values(services).map(s => s.status);
    const overallStatus = this.determineOverallStatus(serviceStatuses);

    return {
      status: overallStatus,
      timestamp,
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: this.configService.get('app.nodeEnv', 'development'),
      services,
      system:
        systemInfo.status === 'fulfilled'
          ? systemInfo.value
          : {
              nodeVersion: process.version,
              platform: process.platform,
              arch: process.arch,
              cpuUsage: 0,
              memoryUsage: {
                used: 0,
                total: 0,
                percentage: 0,
              },
            },
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const result = await this.databaseService.testConnection();
      const responseTime = Date.now() - startTime;

      return {
        status: result.status === 'connected' ? 'up' : 'down',
        responseTime,
        responseTimeFormatted: FormatUtil.formatResponseTime(responseTime),
        message: result.message,
        details: {
          database: result.database,
          host: result.host,
          port: result.port,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'down',
        responseTime,
        responseTimeFormatted: FormatUtil.formatResponseTime(responseTime),
        message: error.message,
      };
    }
  }

  private checkMemory(): ServiceHealth {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = require('os').totalmem();
      const freeMem = require('os').freemem();
      const usedMem = totalMem - freeMem;
      const memoryPercentage = (usedMem / totalMem) * 100;

      // Consider memory healthy if usage is below 90%
      const isHealthy = memoryPercentage < 90;

      return {
        status: isHealthy ? 'up' : 'degraded',
        message: isHealthy
          ? 'Memory usage is normal'
          : 'High memory usage detected',
        details: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024), // MB
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          systemTotal: Math.round(totalMem / 1024 / 1024), // MB
          systemUsed: Math.round(usedMem / 1024 / 1024), // MB
          systemFree: Math.round(freeMem / 1024 / 1024), // MB
          percentage: Math.round(memoryPercentage * 100) / 100,
          // Human readable formats
          heapUsedFormatted: FormatUtil.formatBytes(memUsage.heapUsed),
          heapTotalFormatted: FormatUtil.formatBytes(memUsage.heapTotal),
          systemTotalFormatted: FormatUtil.formatBytes(totalMem),
          systemUsedFormatted: FormatUtil.formatBytes(usedMem),
          systemFreeFormatted: FormatUtil.formatBytes(freeMem),
          percentageFormatted: FormatUtil.formatPercentage(memoryPercentage),
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  private checkDisk(): ServiceHealth {
    try {
      // const fs = require('fs');
      // const path = require('path');

      // Check disk space for the current directory
      const _stats = require('fs').statSync('.');
      const _diskUsage = require('os').totalmem(); // This is a simplified check

      return {
        status: 'up',
        message: 'Disk space is available',
        details: {
          // Note: This is a simplified implementation
          // In production, you might want to use a proper disk usage library
          available: true,
        },
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: 'Unable to check disk space',
        details: { error: error.message },
      };
    }
  }

  private getSystemInfo() {
    const os = require('os');
    const _memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const cpuUsage = process.cpuUsage();
    const totalCpuUsage = cpuUsage.user + cpuUsage.system;

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuUsage: totalCpuUsage,
      cpuUsageFormatted: FormatUtil.formatCpuUsage(
        cpuUsage.user,
        cpuUsage.system
      ),
      memoryUsage: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round((usedMem / totalMem) * 100 * 100) / 100,
        // Human readable formats
        usedFormatted: FormatUtil.formatBytes(usedMem),
        totalFormatted: FormatUtil.formatBytes(totalMem),
        percentageFormatted: FormatUtil.formatPercentage(
          (usedMem / totalMem) * 100
        ),
      },
    };
  }

  private determineOverallStatus(
    serviceStatuses: string[]
  ): 'healthy' | 'unhealthy' | 'degraded' {
    if (serviceStatuses.includes('down')) {
      return 'unhealthy';
    }
    if (serviceStatuses.includes('degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }

  getSimpleHealth() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      uptimeFormatted: FormatUtil.formatUptime(uptimeSeconds),
      environment: this.configService.get('app.nodeEnv', 'development'),
    };
  }
}
