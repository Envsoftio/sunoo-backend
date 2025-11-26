import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderToSubscriptions1761700000000
  implements MigrationInterface
{
  name = 'AddProviderToSubscriptions1761700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Adding provider column to subscriptions table...');

    // Add provider column with NOT NULL constraint and default value 'razorpay'
    await queryRunner.query(
      `ALTER TABLE "subscriptions"
       ADD COLUMN "provider" character varying NOT NULL DEFAULT 'razorpay'`
    );

    console.log(
      '✅ Provider column added successfully. All existing subscriptions defaulted to "razorpay"'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing provider column from subscriptions table...');

    // Remove provider column
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "provider"`
    );

    console.log('✅ Provider column removed successfully');
  }
}
