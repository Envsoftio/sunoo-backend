import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateProgressFieldsToDecimal1759090000000
  implements MigrationInterface
{
  name = 'UpdateProgressFieldsToDecimal1759090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update progress field to support decimal values
    await queryRunner.query(
      `ALTER TABLE "user_progress" ALTER COLUMN "progress" TYPE DECIMAL(10,6)`
    );

    // Update currentTime field to support decimal values
    await queryRunner.query(
      `ALTER TABLE "user_progress" ALTER COLUMN "currentTime" TYPE DECIMAL(10,6)`
    );

    // Update totalTime field to support decimal values
    await queryRunner.query(
      `ALTER TABLE "user_progress" ALTER COLUMN "totalTime" TYPE DECIMAL(10,6)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert progress field to integer
    await queryRunner.query(
      `ALTER TABLE "user_progress" ALTER COLUMN "progress" TYPE INTEGER`
    );

    // Revert currentTime field to integer
    await queryRunner.query(
      `ALTER TABLE "user_progress" ALTER COLUMN "currentTime" TYPE INTEGER`
    );

    // Revert totalTime field to integer
    await queryRunner.query(
      `ALTER TABLE "user_progress" ALTER COLUMN "totalTime" TYPE INTEGER`
    );
  }
}
