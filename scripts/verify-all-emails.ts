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

async function verifyAllEmails() {
  try {
    await dataSource.initialize();
    console.log('📧 Verifying all user emails...\n');

    // Get current stats
    const beforeStats = await dataSource.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN "isEmailVerified" = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN "isEmailVerified" = false THEN 1 END) as unverified_users
      FROM users
    `);

    console.log('📊 Before verification:');
    console.log(`   - Total users: ${beforeStats[0].total_users}`);
    console.log(`   - Verified users: ${beforeStats[0].verified_users}`);
    console.log(`   - Unverified users: ${beforeStats[0].unverified_users}\n`);

    // Update all users to have verified emails
    const result = await dataSource.query(`
      UPDATE users
      SET "isEmailVerified" = true,
          "emailVerificationToken" = NULL
      WHERE "isEmailVerified" = false
    `);

    console.log(`✅ Updated ${result[1]} users to have verified emails`);

    // Get updated stats
    const afterStats = await dataSource.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN "isEmailVerified" = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN "isEmailVerified" = false THEN 1 END) as unverified_users
      FROM users
    `);

    console.log('\n📊 After verification:');
    console.log(`   - Total users: ${afterStats[0].total_users}`);
    console.log(`   - Verified users: ${afterStats[0].verified_users}`);
    console.log(`   - Unverified users: ${afterStats[0].unverified_users}`);

    // Show some sample users
    const sampleUsers = await dataSource.query(`
      SELECT email, "isEmailVerified", "emailVerificationToken"
      FROM users
      WHERE "isEmailVerified" = true
      LIMIT 5
    `);

    console.log('\n📋 Sample verified users:');
    sampleUsers.forEach(user => {
      console.log(`   - ${user.email} (verified: ${user.isEmailVerified})`);
    });

    console.log('\n🎉 All user emails have been verified!');
    console.log('📝 Note: Email verification tokens have been cleared for security');

  } catch (error) {
    console.error('❌ Error verifying emails:', error);
  } finally {
    await dataSource.destroy();
  }
}

verifyAllEmails();
