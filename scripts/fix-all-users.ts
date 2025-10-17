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
    console.log('🔧 Fixing all migrated users...\n');

    // Get initial stats
    const initialStats = await dataSource.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN password = 'default_password' THEN 1 END) as users_with_default_password,
        COUNT(CASE WHEN "hasDefaultPassword" = true THEN 1 END) as users_flagged_for_reset,
        COUNT(CASE WHEN "isEmailVerified" = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN "isEmailVerified" = false THEN 1 END) as unverified_users
      FROM users
    `);

    console.log('📊 Initial user state:');
    console.log(`   - Total users: ${initialStats[0].total_users}`);
    console.log(
      `   - Users with default password: ${initialStats[0].users_with_default_password}`
    );
    console.log(
      `   - Users flagged for password reset: ${initialStats[0].users_flagged_for_reset}`
    );
    console.log(`   - Verified users: ${initialStats[0].verified_users}`);
    console.log(`   - Unverified users: ${initialStats[0].unverified_users}\n`);

    // Step 1: Flag users for password reset
    console.log('🔐 Step 1: Flagging users for password reset...');
    const passwordResult = await dataSource.query(`
      UPDATE users
      SET "hasDefaultPassword" = true
      WHERE password = 'default_password'
    `);
    console.log(
      `✅ Updated ${passwordResult[1]} users to require password reset`
    );

    // Step 2: Verify all emails
    console.log('\n📧 Step 2: Verifying all user emails...');
    const emailResult = await dataSource.query(`
      UPDATE users
      SET "isEmailVerified" = true,
          "emailVerificationToken" = NULL
      WHERE "isEmailVerified" = false
    `);
    console.log(`✅ Updated ${emailResult[1]} users to have verified emails`);

    // Get final stats
    const finalStats = await dataSource.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN password = 'default_password' THEN 1 END) as users_with_default_password,
        COUNT(CASE WHEN "hasDefaultPassword" = true THEN 1 END) as users_flagged_for_reset,
        COUNT(CASE WHEN "isEmailVerified" = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN "isEmailVerified" = false THEN 1 END) as unverified_users
      FROM users
    `);

    console.log('\n📊 Final user state:');
    console.log(`   - Total users: ${finalStats[0].total_users}`);
    console.log(
      `   - Users with default password: ${finalStats[0].users_with_default_password}`
    );
    console.log(
      `   - Users flagged for password reset: ${finalStats[0].users_flagged_for_reset}`
    );
    console.log(`   - Verified users: ${finalStats[0].verified_users}`);
    console.log(`   - Unverified users: ${finalStats[0].unverified_users}`);

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

    console.log('\n🎉 All user fixes completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ All users flagged to require password reset');
    console.log('   ✅ All user emails verified');
    console.log('   ✅ Email verification tokens cleared for security');
    console.log('\n🔐 Next steps:');
    console.log('   - Users will be forced to reset their passwords on login');
    console.log('   - Users can now access email-verified features');
    console.log('   - Monitor the password reset flow in your application');
  } catch (error) {
    console.error('❌ Error fixing users:', error);
  } finally {
    await dataSource.destroy();
  }
}

fixAllUsers();
