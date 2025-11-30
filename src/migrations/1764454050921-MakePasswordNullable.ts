import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePasswordNullable1764454050921 implements MigrationInterface {
  name = 'MakePasswordNullable1764454050921';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make password field nullable for OAuth users (Google, etc.)
    // SAFE: This only changes the column constraint, does NOT modify any existing data
    // All existing password hashes remain unchanged
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert password field to NOT NULL
    // SAFE: Only updates NULL passwords (OAuth users) to empty string before applying constraint
    // Regular users with password hashes are NOT affected - their data remains unchanged
    await queryRunner.query(
      `UPDATE "users" SET "password" = '' WHERE "password" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`
    );
  }
}
