import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateDefaultPasswords1759500000000
  implements MigrationInterface
{
  name = 'MigrateDefaultPasswords1759500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if users table exists and hasDefaultPassword column exists
    const tableExists = await queryRunner.hasTable('users');
    if (!tableExists) {
      console.log('Users table does not exist, skipping password migration');
      return;
    }

    const columnExists = await queryRunner.hasColumn(
      'users',
      'hasDefaultPassword'
    );
    if (!columnExists) {
      console.log(
        'hasDefaultPassword column does not exist, skipping password migration'
      );
      return;
    }

    console.log('🚀 Starting comprehensive user migration...\n');

    // Step 1: Update all users with default_password to hasDefaultPassword = true
    console.log('🔐 Step 1: Handling default password migration...');
    const result = await queryRunner.query(`
            UPDATE users
            SET "hasDefaultPassword" = true
            WHERE password = 'default_password'
        `);

    console.log(`✅ Updated ${result[1] || 0} users to require password reset`);

    // Step 2: Verify all user emails
    console.log('\n📧 Step 2: Verifying all user emails...');
    const emailResult = await queryRunner.query(`
      UPDATE users
      SET "isEmailVerified" = true,
          "emailVerificationToken" = NULL
      WHERE "isEmailVerified" = false
    `);
    console.log(
      `✅ Updated ${emailResult[1] || 0} users to have verified emails`
    );

    // Step 3: Get comprehensive stats
    console.log('\n📊 Step 3: Generating migration statistics...');
    const usersNeedingReset = await queryRunner.query(`
            SELECT COUNT(*) as count FROM users WHERE "hasDefaultPassword" = true
        `);

    const emailStats = await queryRunner.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN "isEmailVerified" = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN "isEmailVerified" = false THEN 1 END) as unverified_users
      FROM users
    `);

    console.log(
      `📊 Total users requiring password reset: ${usersNeedingReset[0]?.count || 0}`
    );
    console.log(`📊 Total users: ${emailStats[0].total_users}`);
    console.log(`📊 Verified users: ${emailStats[0].verified_users}`);
    console.log(`📊 Unverified users: ${emailStats[0].unverified_users}`);

    console.log('\n🎉 Comprehensive user migration completed successfully!');
    console.log('\n📝 Migration Summary:');
    console.log('   ✅ All users with default passwords flagged for reset');
    console.log('   ✅ All user emails verified');
    console.log('   ✅ Email verification tokens cleared for security');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the migration by setting hasDefaultPassword back to false
    // for users who had default_password
    await queryRunner.query(`
            UPDATE users
            SET "hasDefaultPassword" = false
            WHERE password = 'default_password'
        `);

    // Revert email verification
    await queryRunner.query(`
      UPDATE users
      SET "isEmailVerified" = false,
          "emailVerificationToken" = 'pending_verification'
      WHERE "isEmailVerified" = true
    `);

    console.log(
      '✅ Reverted: Reset password flags and email verification status'
    );
  }
}
