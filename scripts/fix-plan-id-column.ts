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

async function fixPlanIdColumn() {
  try {
    await dataSource.initialize();
    console.log('🚀 Fixing plan_id column type...\n');

    // Drop foreign key constraint first
    console.log('🔄 Dropping foreign key constraint...');
    await dataSource.query(`
      ALTER TABLE subscriptions
      DROP CONSTRAINT IF EXISTS "FK_e45fca5d912c3a2fab512ac25dc";
    `);

    // Change plan_id from uuid to varchar
    console.log('🔄 Changing plan_id column from uuid to varchar...');
    await dataSource.query(`
      ALTER TABLE subscriptions
      ALTER COLUMN plan_id TYPE varchar(255);
    `);

    // Note: We won't recreate the foreign key constraint since plan_id is now a varchar
    // and doesn't reference the plans table's UUID primary key

    console.log('✅ Successfully changed plan_id column type to varchar');
    console.log('\n🎉 Column type fix completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

fixPlanIdColumn();
