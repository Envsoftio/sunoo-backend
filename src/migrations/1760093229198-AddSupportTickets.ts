import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupportTickets1760093229198 implements MigrationInterface {
    name = 'AddSupportTickets1760093229198'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."support_tickets_status_enum" AS ENUM('open', 'in_progress', 'resolved', 'closed')`);
        await queryRunner.query(`CREATE TYPE "public"."support_tickets_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TYPE "public"."support_tickets_category_enum" AS ENUM('technical', 'billing', 'account', 'feature_request', 'bug_report', 'general')`);
        await queryRunner.query(`CREATE TABLE "support_tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" text NOT NULL, "status" "public"."support_tickets_status_enum" NOT NULL DEFAULT 'open', "priority" "public"."support_tickets_priority_enum" NOT NULL DEFAULT 'medium', "category" "public"."support_tickets_category_enum" NOT NULL DEFAULT 'general', "assignedTo" character varying, "resolution" character varying, "closedAt" TIMESTAMP, "closedBy" character varying, "responseCount" integer NOT NULL DEFAULT '0', "lastResponseAt" TIMESTAMP, "lastResponseBy" character varying, "userId" uuid NOT NULL, CONSTRAINT "PK_942e8d8f5df86100471d2324643" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "support_ticket_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "content" text NOT NULL, "isInternal" boolean NOT NULL DEFAULT false, "attachmentUrl" character varying, "attachmentName" character varying, "ticketId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_c3e561853b6b303f74fde5a3e1f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_8679e2ff150ff0e253189ca0253" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "FK_7273de5a56e50ed6300fb7ca131" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "FK_4b66c2bd038f7cf9e096e78102d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_ticket_messages" DROP CONSTRAINT "FK_4b66c2bd038f7cf9e096e78102d"`);
        await queryRunner.query(`ALTER TABLE "support_ticket_messages" DROP CONSTRAINT "FK_7273de5a56e50ed6300fb7ca131"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_8679e2ff150ff0e253189ca0253"`);
        await queryRunner.query(`DROP TABLE "support_ticket_messages"`);
        await queryRunner.query(`DROP TABLE "support_tickets"`);
        await queryRunner.query(`DROP TYPE "public"."support_tickets_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."support_tickets_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."support_tickets_status_enum"`);
    }

}
