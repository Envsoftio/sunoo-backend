import { AppDataSource } from '../src/data-source';
import 'reflect-metadata';

/**
 * Script to set provider='email' for all existing password-based users
 * This ensures all email/password accounts are properly identified
 * Run: npm run ts-node scripts/set-email-provider.ts
 */
async function setEmailProvider() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Update all users with null provider and non-null password to provider='email'
    const result = await AppDataSource.query(
      `UPDATE users
       SET provider = 'email'
       WHERE provider IS NULL
       AND password IS NOT NULL`
    );

    console.log(`✅ Updated ${result[1] || 0} users to provider='email'`);

    // Show summary
    const summary = await AppDataSource.query(`
      SELECT
        provider,
        COUNT(*) as count
      FROM users
      GROUP BY provider
      ORDER BY provider NULLS LAST
    `);

    console.log('\n📊 Provider distribution:');
    summary.forEach((row: any) => {
      console.log(`   ${row.provider || 'NULL'}: ${row.count} users`);
    });

    await AppDataSource.destroy();
    console.log('\n✅ Script completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setEmailProvider();
