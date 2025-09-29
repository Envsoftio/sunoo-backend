import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'sunooapp',
});

async function fixMigratedUsers() {
  try {
    await dataSource.initialize();
    console.log('🔧 Fixing migrated users to require password reset...\n');

    // Update all users with default_password to hasDefaultPassword = true
    const result = await dataSource.query(`
      UPDATE users
      SET "hasDefaultPassword" = true
      WHERE password = 'default_password'
    `);

    console.log(`✅ Updated ${result[1]} users to require password reset`);

    // Show users who now need to reset their passwords
    const usersNeedingReset = await dataSource.query(`
      SELECT email, "hasDefaultPassword"
      FROM users
      WHERE "hasDefaultPassword" = true
      LIMIT 10
    `);

    console.log(`\n🔐 Users who need to reset their passwords (showing first 10):`);
    usersNeedingReset.forEach(user => {
      console.log(`   - ${user.email}`);
    });

    const totalCount = await dataSource.query(`
      SELECT COUNT(*) as count FROM users WHERE "hasDefaultPassword" = true
    `);

    console.log(`\n📊 Total users requiring password reset: ${totalCount[0].count}`);

  } catch (error) {
    console.error('❌ Error fixing migrated users:', error);
  } finally {
    await dataSource.destroy();
  }
}

fixMigratedUsers();
