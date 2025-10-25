import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailToCastMembers1761390821099 implements MigrationInterface {
    name = 'AddEmailToCastMembers1761390821099'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cast_members" ADD "email" character varying`);
        await queryRunner.query(`ALTER TYPE "public"."support_tickets_status_enum" RENAME TO "support_tickets_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."support_tickets_status_enum" AS ENUM('open', 'in_progress', 'closed')`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" TYPE "public"."support_tickets_status_enum" USING "status"::"text"::"public"."support_tickets_status_enum"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" SET DEFAULT 'open'`);
        await queryRunner.query(`DROP TYPE "public"."support_tickets_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "UQ_payment_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "UQ_payment_id" UNIQUE ("payment_id")`);
        await queryRunner.query(`CREATE TYPE "public"."support_tickets_status_enum_old" AS ENUM('open', 'in_progress', 'resolved', 'closed')`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" TYPE "public"."support_tickets_status_enum_old" USING "status"::"text"::"public"."support_tickets_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "status" SET DEFAULT 'open'`);
        await queryRunner.query(`DROP TYPE "public"."support_tickets_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."support_tickets_status_enum_old" RENAME TO "support_tickets_status_enum"`);
        await queryRunner.query(`ALTER TABLE "cast_members" DROP COLUMN "email"`);
    }

}
