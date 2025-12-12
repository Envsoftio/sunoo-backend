import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCategoriesToBanner1765548536300 implements MigrationInterface {
  name = 'UpdateCategoriesToBanner1765548536300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old columns
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "icon_url"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "color"`);

    // Add the new banner_url column
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "banner_url" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the old columns
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "icon_url" character varying`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "color" character varying`);

    // Drop the new banner_url column
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "banner_url"`);
  }
}
