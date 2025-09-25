import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'sunoo_backend',
  synchronize: false,
  logging: true,
});

async function testDatabase() {
  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Test categories table
    const result = await dataSource.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);

    console.log('Categories table columns:');
    result.forEach((row) => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
  }
}

testDatabase();
