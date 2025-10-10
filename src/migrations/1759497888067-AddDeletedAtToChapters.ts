import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToChapters1759497888067 implements MigrationInterface {
  name = 'AddDeletedAtToChapters1759497888067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN "deleted_at"`);
  }
}
