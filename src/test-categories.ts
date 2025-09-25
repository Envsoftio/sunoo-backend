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
  entities: ['src/entities/*.entity.ts'],
  synchronize: false,
  logging: true,
});

async function testCategories() {
  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Test direct query
    const result = await dataSource.query('SELECT * FROM categories LIMIT 1');
    console.log('Direct query result:', result);

    // Test TypeORM query
    const categoryRepo = dataSource.getRepository('Category');
    const categories = await categoryRepo.find();
    console.log('TypeORM query result:', categories);

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
  }
}

testCategories();
