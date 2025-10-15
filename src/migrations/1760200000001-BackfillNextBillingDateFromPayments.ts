import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillNextBillingDateFromPayments1760200000001
  implements MigrationInterface
{
  name = 'BackfillNextBillingDateFromPayments1760200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Iterate each subscription, fetch latest payment and plan frequency, compute next_billing_date
    const subscriptions: Array<{
      id: number;
      subscription_id: string | null;
      plan_id: string | null;
    }> = await queryRunner.query(
      `SELECT id, subscription_id, plan_id FROM "subscriptions"`
    );

    for (const sub of subscriptions) {
      if (!sub.subscription_id) continue;

      // Latest payment for this subscription
      const payments: Array<{ payment_created_at: string | Date | null }> =
        await queryRunner.query(
          `SELECT payment_created_at
         FROM "payments"
         WHERE subscription_id = $1 AND payment_created_at IS NOT NULL
         ORDER BY payment_created_at DESC
         LIMIT 1`,
          [sub.subscription_id]
        );

      if (!payments.length || !payments[0].payment_created_at) continue;
      const latestPaymentCreatedAt = payments[0].payment_created_at;

      // Resolve plan frequency: prefer matching plans.razorpayPlanId, fallback to plans.id
      let frequencyRow: Array<{ frequency: string | null }> = [];
      if (sub.plan_id) {
        frequencyRow = await queryRunner.query(
          `SELECT frequency FROM "plans" WHERE "razorpayPlanId" = $1 LIMIT 1`,
          [sub.plan_id]
        );
      }
      if (!frequencyRow.length) {
        console.log('frequencyRow not found-------------------', sub.plan_id);
        continue;
      }
      console.log('frequencyRow-------------------', frequencyRow);

      const frequency = (frequencyRow[0]?.frequency || '').toLowerCase();
      if (frequency !== 'monthly' && frequency !== 'yearly') {
        // Skip if frequency is unknown
        continue;
      }

      // Let Postgres compute the date addition and cast to date
      await queryRunner.query(
        `UPDATE "subscriptions"
         SET "next_billing_date" = (
           CASE WHEN $3 = 'monthly' THEN ($1::timestamptz + INTERVAL '30 days')::date
                WHEN $3 = 'yearly'  THEN ($1::timestamptz + INTERVAL '365 days')::date
           END
         )
         WHERE id = $2`,
        [latestPaymentCreatedAt, sub.id, frequency]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort revert: nullify values that match computed dates from latest payment and plan frequency
    await queryRunner.query(`
      UPDATE "subscriptions" s
      SET "next_billing_date" = NULL
      FROM (
        SELECT pay.subscription_id,
               MAX(pay.payment_created_at) AS latest_payment_date
        FROM "payments" pay
        WHERE pay.subscription_id IS NOT NULL AND pay.payment_created_at IS NOT NULL
        GROUP BY pay.subscription_id
      ) p
      LEFT JOIN "plans" pl ON pl."razorpayPlanId" = s."plan_id"
      WHERE s."subscription_id" = p."subscription_id"
        AND (
          (LOWER(pl."frequency") = 'monthly' AND s."next_billing_date" = (p.latest_payment_date + INTERVAL '30 days')::date)
          OR
          (LOWER(pl."frequency") = 'yearly' AND s."next_billing_date" = (p.latest_payment_date + INTERVAL '365 days')::date)
        );
    `);
  }
}
