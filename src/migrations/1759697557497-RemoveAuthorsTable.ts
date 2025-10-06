import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAuthorsTable1759697557497 implements MigrationInterface {
  name = 'RemoveAuthorsTable1759697557497';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the authors table
    await queryRunner.query(`DROP TABLE IF EXISTS "authors"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the authors table if needed to rollback
    await queryRunner.query(
      `CREATE TABLE "authors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying, "bio" character varying, "picture" character varying, CONSTRAINT "PK_d2ed02fabd9b52847ccb85e6b88" PRIMARY KEY ("id"))`
    );
  }
}
