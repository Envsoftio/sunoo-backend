import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * @deprecated This migration was used during the initial Supabase migration.
 * Migration is complete - this file is kept for historical reference only.
 * No new default passwords or email verifications should be set.
 */
export class MigrateDefaultPasswords1759500000000
  implements MigrationInterface
{
  name = 'MigrateDefaultPasswords1759500000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // SAFETY: This migration is deprecated and has already been executed.
    // Migration from Supabase is complete. This is now a no-op to prevent
    // accidental re-execution that could set default passwords or auto-verify emails.
    console.log('⚠️  Migration already completed. This is a no-op for safety.');
    console.log(
      '   Supabase migration is complete - no default passwords or email verifications will be set.'
    );
    // No database operations - completely safe no-op
    await Promise.resolve(); // Satisfy async requirement
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // SAFETY: This migration is deprecated. Down migration is also a no-op.
    console.log(
      '⚠️  Migration is deprecated. Down migration is a no-op for safety.'
    );
    // No database operations - completely safe no-op
    await Promise.resolve(); // Satisfy async requirement
  }
}
