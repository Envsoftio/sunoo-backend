import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushNotifications1761600000000 implements MigrationInterface {
  name = 'AddPushNotifications1761600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create device_tokens table
    await queryRunner.query(
      `CREATE TABLE "device_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId" uuid,
        "token" character varying NOT NULL,
        "platform" character varying NOT NULL CHECK ("platform" IN ('android', 'ios')),
        "deviceId" character varying,
        "deviceInfo" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastUsedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_device_tokens_token" UNIQUE ("token"),
        CONSTRAINT "PK_device_tokens" PRIMARY KEY ("id")
      )`
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_device_tokens_userId" ON "device_tokens" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_tokens_token" ON "device_tokens" ("token")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_tokens_isActive" ON "device_tokens" ("isActive")`
    );

    // Add foreign key constraint for userId (nullable)
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_device_tokens_userId" 
       FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // Add push notification preferences to users table
    await queryRunner.query(
      `ALTER TABLE "users" 
       ADD COLUMN "push_notifications_enabled" boolean NOT NULL DEFAULT true,
       ADD COLUMN "push_subscription_enabled" boolean NOT NULL DEFAULT true,
       ADD COLUMN "push_engagement_enabled" boolean NOT NULL DEFAULT true,
       ADD COLUMN "push_marketing_enabled" boolean NOT NULL DEFAULT true,
       ADD COLUMN "push_preferences_updated_at" TIMESTAMP WITH TIME ZONE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove push notification preferences from users table
    await queryRunner.query(
      `ALTER TABLE "users" 
       DROP COLUMN "push_notifications_enabled",
       DROP COLUMN "push_subscription_enabled",
       DROP COLUMN "push_engagement_enabled",
       DROP COLUMN "push_marketing_enabled",
       DROP COLUMN "push_preferences_updated_at"`
    );

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_device_tokens_userId"`
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_device_tokens_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_device_tokens_token"`);
    await queryRunner.query(`DROP INDEX "IDX_device_tokens_userId"`);

    // Drop device_tokens table
    await queryRunner.query(`DROP TABLE "device_tokens"`);
  }
}


