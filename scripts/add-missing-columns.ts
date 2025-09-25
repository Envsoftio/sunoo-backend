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
});

async function addMissingColumns() {
  try {
    await dataSource.initialize();
    console.log('🚀 Adding missing columns...\n');

    const columnsToAdd = [
      {
        table: 'cast_members',
        column: 'updated_at',
        definition: 'timestamp with time zone DEFAULT now()'
      },
      {
        table: 'story_casts',
        column: 'updated_at',
        definition: 'timestamp with time zone DEFAULT now()'
      }
    ];

    for (const { table, column, definition } of columnsToAdd) {
      try {
        console.log(`🔄 Adding ${column} to ${table}...`);
        await dataSource.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
        console.log(`✅ Successfully added ${column} to ${table}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Column ${column} already exists in ${table}`);
        } else {
          console.error(`❌ Error adding ${column} to ${table}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Column addition completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

addMissingColumns();
