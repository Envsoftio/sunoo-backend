import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveNarratorTable1759697557496 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the narrators table if it exists
    await queryRunner.query(`DROP TABLE IF EXISTS "narrators" CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the narrators table (for rollback)
    await queryRunner.query(`
            CREATE TABLE "narrators" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "name" character varying,
                "email" character varying,
                "phone" numeric,
                "social" json,
                "languages" json,
                "userId" uuid NOT NULL,
                "chapterCoverURL" character varying,
                CONSTRAINT "PK_narrators" PRIMARY KEY ("id")
            )
        `);
  }
}
