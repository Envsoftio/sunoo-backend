import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSessionsTable1759089445647
  implements MigrationInterface
{
  name = 'CreateUserSessionsTable1759089445647';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Creating user_sessions table...');

    await queryRunner.query(
      `CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "refreshToken" character varying NOT NULL, "accessToken" character varying, "expiresAt" TIMESTAMP NOT NULL, "lastUsedAt" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "userAgent" character varying, "ipAddress" character varying, "deviceInfo" character varying, "metadata" jsonb, CONSTRAINT "UQ_56ca06637d897e5d0b970ef5255" UNIQUE ("refreshToken"), CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_a5f2c875043dcf84df7b73ed73" ON "user_sessions" ("expiresAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_56ca06637d897e5d0b970ef525" ON "user_sessions" ("refreshToken") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_36cbbaa23a16cc814fc39f1a7e" ON "user_sessions" ("userId", "isActive") `
    );

    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_55fa4db8406ed66bc7044328427" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    console.log('✅ User sessions table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Dropping user_sessions table...');

    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_55fa4db8406ed66bc7044328427"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_36cbbaa23a16cc814fc39f1a7e"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_56ca06637d897e5d0b970ef525"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a5f2c875043dcf84df7b73ed73"`
    );
    await queryRunner.query(`DROP TABLE "user_sessions"`);

    console.log('✅ User sessions table dropped successfully');
  }
}
