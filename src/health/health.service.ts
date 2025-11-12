import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { FormatUtil } from '../utils/format.util';
import * as os from 'os';

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
    cpuUsageFormatted: string;
    cpuCores: number;
    cpuModel: string;
    loadAverage: number[];
    loadAverageFormatted: string[];
    perCoreUsage?: Array<{
      core: number;
      usage: number;
      usageFormatted: string;
    }>;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
      usedFormatted: string;
      totalFormatted: string;
      percentageFormatted: string;
    };
    diskUsage?: {
      total: number;
      free: number;
      used: number;
      percentage: number;
      totalFormatted: string;
      freeFormatted: string;
      usedFormatted: string;
      percentageFormatted: string;
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
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private startTime = Date.now();
  private previousCpuUsage: NodeJS.CpuUsage | null = null;
  private previousCpuTime: number = 0;
  private cpuUsageInterval: NodeJS.Timeout | null = null;
  private currentCpuPercentage: number = 0;
  private perCoreUsage: Array<{ core: number; usage: number }> = [];

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService
  ) {}

  onModuleInit() {
    // Initialize CPU monitoring
    this.previousCpuUsage = process.cpuUsage();
    this.previousCpuTime = Date.now();

    // Update CPU usage every second
    this.cpuUsageInterval = setInterval(() => {
      this.updateCpuUsage();
    }, 1000);
  }

  onModuleDestroy() {
    if (this.cpuUsageInterval) {
      clearInterval(this.cpuUsageInterval);
    }
  }

  private updateCpuUsage() {
    if (!this.previousCpuUsage) {
      this.previousCpuUsage = process.cpuUsage();
      this.previousCpuTime = Date.now();
      return;
    }

    const currentCpuUsage = process.cpuUsage(this.previousCpuUsage);
    const currentTime = Date.now();
    const timeDiff = (currentTime - this.previousCpuTime) / 1000; // in seconds

    // Calculate CPU percentage
    const totalCpuTime =
      (currentCpuUsage.user + currentCpuUsage.system) / 1000000; // Convert to seconds
    this.currentCpuPercentage = (totalCpuTime / timeDiff) * 100;

    // Calculate per-core usage
    this.calculatePerCoreUsage();

    this.previousCpuUsage = process.cpuUsage();
    this.previousCpuTime = currentTime;
  }

  private calculatePerCoreUsage() {
    const cpus = os.cpus();
    this.perCoreUsage = cpus.map((cpu, index) => {
      const total = Object.values(cpu.times).reduce(
        (acc, time) => acc + time,
        0
      );
      const idle = cpu.times.idle;
      const usage = ((total - idle) / total) * 100;
      return { core: index, usage: Math.round(usage * 100) / 100 };
    });
  }

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
              cpuUsageFormatted: '0.0%',
              cpuCores: os.cpus().length,
              cpuModel: 'Unknown',
              loadAverage: [0, 0, 0],
              loadAverageFormatted: ['0.00', '0.00', '0.00'],
              memoryUsage: {
                used: 0,
                total: 0,
                percentage: 0,
                usedFormatted: '0 Bytes',
                totalFormatted: '0 Bytes',
                percentageFormatted: '0.0%',
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
      const fs = require('fs');

      // Get disk stats for the root partition
      const stats = fs.statfsSync ? fs.statfsSync('/') : null;

      if (stats) {
        // statfsSync returns bytes
        const total = stats.blocks * stats.bsize;
        const free = stats.bavail * stats.bsize;
        const used = total - free;
        const percentage = (used / total) * 100;

        const isHealthy = percentage < 90;

        return {
          status: isHealthy ? 'up' : 'degraded',
          message: isHealthy
            ? 'Disk space is available'
            : 'High disk usage detected',
          details: {
            total: Math.round(total / 1024 / 1024), // MB
            free: Math.round(free / 1024 / 1024), // MB
            used: Math.round(used / 1024 / 1024), // MB
            percentage: Math.round(percentage * 100) / 100,
            totalFormatted: FormatUtil.formatBytes(total),
            freeFormatted: FormatUtil.formatBytes(free),
            usedFormatted: FormatUtil.formatBytes(used),
            percentageFormatted: FormatUtil.formatPercentage(percentage),
          },
        };
      }

      // Fallback: try to get disk space using df command (Unix-like systems)
      return {
        status: 'up',
        message: 'Disk space check not available on this platform',
        details: {
          available: true,
          note: 'Detailed disk stats require statfsSync support',
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
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercentage = (usedMem / totalMem) * 100;

    // Get CPU info
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
    const cpuCores = cpus.length;

    // Get load averages (1min, 5min, 15min)
    const loadAvg = os.loadavg();
    const loadAvgFormatted = loadAvg.map(avg => avg.toFixed(2));

    // Get disk usage if available
    let diskUsage:
      | {
          total: number;
          free: number;
          used: number;
          percentage: number;
          totalFormatted: string;
          freeFormatted: string;
          usedFormatted: string;
          percentageFormatted: string;
        }
      | undefined = undefined;
    try {
      const fs = require('fs');
      if (fs.statfsSync) {
        const stats = fs.statfsSync('/');
        const total = stats.blocks * stats.bsize;
        const free = stats.bavail * stats.bsize;
        const used = total - free;
        const percentage = (used / total) * 100;

        diskUsage = {
          total: Math.round(total / 1024 / 1024), // MB
          free: Math.round(free / 1024 / 1024), // MB
          used: Math.round(used / 1024 / 1024), // MB
          percentage: Math.round(percentage * 100) / 100,
          totalFormatted: FormatUtil.formatBytes(total),
          freeFormatted: FormatUtil.formatBytes(free),
          usedFormatted: FormatUtil.formatBytes(used),
          percentageFormatted: FormatUtil.formatPercentage(percentage),
        };
      }
    } catch {
      // Disk stats not available
    }

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuUsage: Math.round(this.currentCpuPercentage * 100) / 100,
      cpuUsageFormatted: FormatUtil.formatPercentage(this.currentCpuPercentage),
      cpuCores,
      cpuModel,
      loadAverage: loadAvg,
      loadAverageFormatted: loadAvgFormatted,
      perCoreUsage: this.perCoreUsage.map(core => ({
        core: core.core,
        usage: core.usage,
        usageFormatted: FormatUtil.formatPercentage(core.usage),
      })),
      memoryUsage: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round(memoryPercentage * 100) / 100,
        usedFormatted: FormatUtil.formatBytes(usedMem),
        totalFormatted: FormatUtil.formatBytes(totalMem),
        percentageFormatted: FormatUtil.formatPercentage(memoryPercentage),
      },
      diskUsage,
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
