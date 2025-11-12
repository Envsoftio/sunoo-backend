import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProgressTimeColumn1761510000000
  implements MigrationInterface
{
  name = 'RemoveProgressTimeColumn1761510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before dropping
    const columnExists = await queryRunner.hasColumn(
      'user_progress',
      'progress_time'
    );

    if (columnExists) {
      // Drop the progress_time column
      await queryRunner.query(`
        ALTER TABLE "user_progress"
        DROP COLUMN IF EXISTS "progress_time"
      `);
      console.log('✅ Dropped progress_time column from user_progress table');
    } else {
      console.log('ℹ️  progress_time column does not exist, skipping');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the column if needed to rollback
    const columnExists = await queryRunner.hasColumn(
      'user_progress',
      'progress_time'
    );

    if (!columnExists) {
      await queryRunner.query(`
        ALTER TABLE "user_progress"
        ADD COLUMN "progress_time" numeric
      `);

      // Backfill with currentTime values
      await queryRunner.query(`
        UPDATE "user_progress"
        SET "progress_time" = "currentTime"
        WHERE "progress_time" IS NULL
      `);

      console.log(
        '✅ Re-added progress_time column and backfilled from currentTime'
      );
    }
  }
}
