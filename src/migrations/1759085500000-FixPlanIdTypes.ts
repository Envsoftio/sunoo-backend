import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPlanIdTypes1759085500000 implements MigrationInterface {
  name = 'FixPlanIdTypes1759085500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Fixing plan_id types to support Razorpay plan IDs...');

    // Drop foreign key constraints first
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc"`
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_f9b6a4c3196864cdd91b1a440ee"`
    );

    // Change plan_id from uuid to varchar in subscriptions table
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "plan_id" TYPE character varying`
    );

    // Change plan_id from uuid to varchar in payments table
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "plan_id" TYPE character varying`
    );

    // Note: We don't add foreign key constraints back because plan_id now stores
    // external Razorpay plan IDs, not internal UUIDs. This allows for more flexibility
    // when dealing with external payment provider data.

    console.log(
      '✅ Plan ID types fixed successfully (foreign keys removed for external IDs)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Reverting plan_id types...');

    // Note: This down migration is problematic because:
    // 1. Foreign key constraints were already dropped in up()
    // 2. Converting back to UUID will fail if plan_id contains Razorpay IDs
    // 3. This migration should be considered irreversible in practice
    
    console.log('⚠️ WARNING: This down migration may fail if plan_id contains non-UUID values');
    console.log('⚠️ Consider this migration irreversible in production environments');
    
    // Only attempt to revert if plan_id values are valid UUIDs
    try {
      // Check if plan_id values are valid UUIDs before attempting conversion
      const subscriptionCheck = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM subscriptions 
        WHERE plan_id IS NOT NULL 
        AND plan_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      `);
      
      const paymentCheck = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM payments 
        WHERE plan_id IS NOT NULL 
        AND plan_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      `);

      if (subscriptionCheck[0].count > 0 || paymentCheck[0].count > 0) {
        console.log('❌ Cannot revert: plan_id contains non-UUID values (likely Razorpay IDs)');
        console.log('❌ This migration is effectively irreversible');
        return;
      }

      // Change plan_id back to uuid (only if all values are valid UUIDs)
      await queryRunner.query(
        `ALTER TABLE "subscriptions" ALTER COLUMN "plan_id" TYPE uuid USING plan_id::uuid`
      );
      await queryRunner.query(
        `ALTER TABLE "payments" ALTER COLUMN "plan_id" TYPE uuid USING plan_id::uuid`
      );

      // Add back original foreign key constraints
      await queryRunner.query(
        `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
      );
      await queryRunner.query(
        `ALTER TABLE "payments" ADD CONSTRAINT "FK_f9b6a4c3196864cdd91b1a440ee" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
      );

      console.log('✅ Plan ID types reverted');
    } catch (error) {
      console.log('❌ Revert failed:', error.message);
      console.log('❌ This migration is effectively irreversible');
    }
  }
}
