import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FormatUtil } from '../utils/format.util';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource
  ) {}

  async testConnection(): Promise<{
    status: string;
    message: string;
    database: string;
    host: string;
    port: number;
    timestamp: string;
  }> {
    try {
      // Test basic connection
      await this.dataSource.query('SELECT 1');

      // Get database info
      const dbInfo = await this.dataSource.query(`
        SELECT
          current_database() as database_name,
          inet_server_addr() as host,
          inet_server_port() as port,
          version() as version
      `);

      return {
        status: 'connected',
        message: 'Database connection successful',
        database: dbInfo[0]?.database_name || 'unknown',
        host: dbInfo[0]?.host || 'unknown',
        port: dbInfo[0]?.port || 5432,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Database connection failed: ${error.message}`,
        database: 'unknown',
        host: 'unknown',
        port: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getTableInfo(): Promise<{
    tables: Array<{
      table_name: string;
      table_type: string;
    }>;
    count: number;
  }> {
    try {
      const tables = await this.dataSource.query(`
        SELECT
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      return {
        tables,
        count: tables.length,
      };
    } catch (error) {
      throw new Error(`Failed to get table info: ${error.message}`);
    }
  }

  async getDatabaseStats(): Promise<{
    totalTables: number;
    totalConnections: number;
    databaseSize: string;
    uptime: string;
    uptimeSeconds: number;
    totalTablesFormatted: string;
    totalConnectionsFormatted: string;
  }> {
    try {
      const [tableCount, connections, dbSize, uptime] = await Promise.all([
        this.dataSource.query(`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema = 'public'
        `),
        this.dataSource.query(`
          SELECT COUNT(*) as count
          FROM pg_stat_activity
          WHERE state = 'active'
        `),
        this.dataSource.query(`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `),
        this.dataSource.query(`
          SELECT
            EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time())) as uptime_seconds
        `),
      ]);

      const uptimeSeconds = parseInt(uptime[0]?.uptime_seconds || '0');
      const totalTables = parseInt(tableCount[0]?.count || '0');
      const totalConnections = parseInt(connections[0]?.count || '0');

      return {
        totalTables,
        totalConnections,
        databaseSize: dbSize[0]?.size || 'unknown',
        uptime: FormatUtil.formatUptime(uptimeSeconds),
        uptimeSeconds, // Keep raw value for detailed analysis
        totalTablesFormatted: FormatUtil.formatNumber(totalTables),
        totalConnectionsFormatted: FormatUtil.formatNumber(totalConnections),
      };
    } catch (error) {
      throw new Error(`Failed to get database stats: ${error.message}`);
    }
  }
}
