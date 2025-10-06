import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToBooks1759786749771 implements MigrationInterface {
  name = 'AddDeletedAtToBooks1759786749771';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "books" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "books" DROP COLUMN "deleted_at"`);
  }
}
