import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentCreatedAt1760200000000 implements MigrationInterface {
  name = 'AddPaymentCreatedAt1760200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add nullable column
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN "payment_created_at" TIMESTAMP WITH TIME ZONE`
    );

    // 2) Backfill from metadata.created_at (Razorpay sends epoch seconds). If string/number, convert; else leave null
    // Try to handle created_at provided as numeric seconds within jsonb
    await queryRunner.query(`
      UPDATE "payments"
      SET "payment_created_at" =
        CASE
          WHEN (metadata ->> 'created_at') ~ '^[0-9]+$' THEN to_timestamp((metadata ->> 'created_at')::bigint)
          WHEN (metadata ->> 'created_at') ~ '^[0-9]+\\.[0-9]+$' THEN to_timestamp((metadata ->> 'created_at')::double precision)
          ELSE NULL
        END
      WHERE metadata IS NOT NULL;
    `);

    // 3) Create function to sync column from metadata.created_at on insert/update
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION payments_sync_payment_created_at()
      RETURNS trigger AS $$
      DECLARE
        created_at_text text;
      BEGIN
        created_at_text := NEW.metadata ->> 'created_at';
        IF created_at_text IS NULL THEN
          NEW.payment_created_at := NULL;
        ELSIF created_at_text ~ '^[0-9]+$' THEN
          NEW.payment_created_at := to_timestamp(created_at_text::bigint);
        ELSIF created_at_text ~ '^[0-9]+\\.[0-9]+$' THEN
          NEW.payment_created_at := to_timestamp(created_at_text::double precision);
        ELSE
          -- Attempt to cast as timestamptz if provided in ISO8601
          BEGIN
            NEW.payment_created_at := (created_at_text)::timestamptz;
          EXCEPTION WHEN others THEN
            NEW.payment_created_at := NULL;
          END;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 4) Trigger on insert or when metadata changes
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_payments_sync_payment_created_at ON "payments";
      CREATE TRIGGER trg_payments_sync_payment_created_at
      BEFORE INSERT OR UPDATE OF metadata ON "payments"
      FOR EACH ROW EXECUTE FUNCTION payments_sync_payment_created_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_payments_sync_payment_created_at ON "payments";`
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS payments_sync_payment_created_at();`
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "payment_created_at"`
    );
  }
}
