import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToUserProgress1761500000000
  implements MigrationInterface
{
  name = 'AddUniqueConstraintToUserProgress1761500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if duplicates exist first (safer for production)
    const duplicateCount = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM (
        SELECT "userId", "bookId", "chapterId", COUNT(*) as cnt
        FROM user_progress
        GROUP BY "userId", "bookId", "chapterId"
        HAVING COUNT(*) > 1
      ) duplicates
    `);

    if (duplicateCount[0]?.count > 0) {
      console.log(
        `Found ${duplicateCount[0].count} duplicate groups. Cleaning up...`
      );

      // Remove duplicates by keeping the record with the highest id (most recent)
      // This is safer than deleting by timestamp comparison
      await queryRunner.query(`
        DELETE FROM user_progress
        WHERE id IN (
          SELECT id
          FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                     PARTITION BY "userId", "bookId", "chapterId"
                     ORDER BY id DESC
                   ) as rn
            FROM user_progress
          ) ranked
          WHERE rn > 1
        )
      `);
    }

    // Add unique constraint to prevent duplicates
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_user_progress_user_book_chapter"
      ON "user_progress" ("userId", "bookId", "chapterId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraint
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_user_progress_user_book_chapter"
    `);
  }
}
