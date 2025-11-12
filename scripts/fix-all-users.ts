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

async function fixAllUsers() {
  try {
    await dataSource.initialize();
    console.log('🔧 User statistics script...\n');

    // Get user stats
    const stats = await dataSource.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN "hasDefaultPassword" = true THEN 1 END) as users_flagged_for_reset,
        COUNT(CASE WHEN "isEmailVerified" = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN "isEmailVerified" = false THEN 1 END) as unverified_users
      FROM users
    `);

    console.log('📊 User statistics:');
    console.log(`   - Total users: ${stats[0].total_users}`);
    console.log(
      `   - Users flagged for password reset: ${stats[0].users_flagged_for_reset}`
    );
    console.log(`   - Verified users: ${stats[0].verified_users}`);
    console.log(`   - Unverified users: ${stats[0].unverified_users}`);

    // Show sample users
    const sampleUsers = await dataSource.query(`
      SELECT email, "hasDefaultPassword", "isEmailVerified"
      FROM users
      LIMIT 5
    `);

    console.log('\n📋 Sample users:');
    sampleUsers.forEach(user => {
      console.log(
        `   - ${user.email} (needs password reset: ${user.hasDefaultPassword}, email verified: ${user.isEmailVerified})`
      );
    });

    console.log('\n✅ User statistics retrieved successfully!');
    console.log('\n📝 Note: Migration from Supabase is complete.');
    console.log(
      '   - No automatic password or email verification changes are made.'
    );
  } catch (error) {
    console.error('❌ Error fixing users:', error);
  } finally {
    await dataSource.destroy();
  }
}

void fixAllUsers();
