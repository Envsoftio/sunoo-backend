import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPaymentsSequenceAndAddUniqueConstraint1761219000001
  implements MigrationInterface
{
  name = 'FixPaymentsSequenceAndAddUniqueConstraint1761219000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if unique constraint already exists
    const constraintExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'UQ_payment_id'
      AND table_name = 'payments'
    `);

    // Add unique constraint to payment_id column if it doesn't exist
    if (constraintExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "payments" ADD CONSTRAINT "UQ_payment_id" UNIQUE ("payment_id")`
      );
    }

    // Fix the sequence to match the current max ID
    await queryRunner.query(
      `SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraint from payment_id column
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "UQ_payment_id"`
    );

    // Note: We don't rollback the sequence fix as it's a data correction
    // that should remain in place
  }
}
