import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1759085444093 implements MigrationInterface {
  name = 'InitialSchema1759085444093';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" character varying, "icon_url" character varying, "color" character varying, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer, "featured" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "user_progress" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "bookId" uuid NOT NULL, "chapterId" uuid NOT NULL, "totalNumberOfReadingTimes" numeric, "progress_time" numeric, "progress" integer NOT NULL DEFAULT '0', "currentTime" integer NOT NULL DEFAULT '0', "totalTime" integer NOT NULL DEFAULT '0', "lastListenedAt" TIMESTAMP, CONSTRAINT "PK_7b5eb2436efb0051fdf05cbe839" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "chapter_bookmarks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "bookId" uuid, "userId" uuid, "chapterId" uuid, "bookmarkText" text, "audioTimeStamp" character varying, "timestamp" integer NOT NULL DEFAULT '0', "note" text, CONSTRAINT "PK_e07fdaf93ebdf39d7d7df49b967" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "chapters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "playbackTime" character varying, "bookId" uuid, "chapterUrl" character varying, "order" numeric, CONSTRAINT "PK_a2bbdbb4bdc786fe0cb0fcfc4a0" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "book_ratings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "bookId" uuid, "userId" uuid, "rating" numeric, "comment" text, "review" integer, CONSTRAINT "PK_8393acfb46403c657edb950f7c1" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "audiobook_listeners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "userId" uuid, "bookId" uuid, "count" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_e4024620ea764e2efa8fcc4b104" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "books" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying NOT NULL, "bookCoverUrl" character varying, "language" character varying, "bookDescription" character varying, "duration" character varying, "isPublished" boolean NOT NULL DEFAULT false, "categoryId" uuid, "isFree" boolean NOT NULL DEFAULT false, "contentRating" character varying, "tags" character varying, "slug" character varying NOT NULL, CONSTRAINT "UQ_4dc5a40933419641440fbd95e8e" UNIQUE ("slug"), CONSTRAINT "PK_f3f2f25a099d24e12545b70b022" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "bookmarks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "bookId" uuid, "userId" uuid, CONSTRAINT "PK_7f976ef6cecd37a53bd11685f32" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "feedbacks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, "name" character varying, "email" character varying, "type" character varying, "message" text, "rating" integer NOT NULL DEFAULT '1', "subject" character varying, "status" character varying NOT NULL DEFAULT 'pending', CONSTRAINT "PK_79affc530fdd838a9f1e0cc30be" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying, "avatar" character varying, "role" character varying, "authId" character varying, "provider" character varying, "country" character varying, "isActive" boolean NOT NULL DEFAULT true, "isEmailVerified" boolean NOT NULL DEFAULT false, "emailVerificationToken" character varying, "lastLoginAt" TIMESTAMP, "isAuthenticated" boolean, "language" character varying, "imageURL" character varying, "bio" character varying, "availedTrial" boolean NOT NULL DEFAULT false, "email_notifications_enabled" boolean NOT NULL DEFAULT true, "marketing_emails_enabled" boolean NOT NULL DEFAULT true, "new_content_emails_enabled" boolean NOT NULL DEFAULT true, "subscription_emails_enabled" boolean NOT NULL DEFAULT true, "email_preferences_updated_at" TIMESTAMP, "hasDefaultPassword" boolean NOT NULL DEFAULT false, "passwordResetToken" character varying, "passwordResetExpires" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "invoice_id" character varying, "plan_id" uuid, "currency" character varying, "status" character varying, "metadata" jsonb, "payment_id" character varying, "amount" character varying, "user_id" uuid, "subscription_id" character varying, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "planName" character varying, "razorpayPlanId" character varying, "currency" character varying, "amount" numeric, "liveMode" boolean, "description" character varying, "frequency" character varying, CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "subscriptions" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "subscription_id" character varying, "plan_id" uuid, "start_date" date, "end_date" date, "status" character varying, "next_billing_date" date, "metadata" jsonb, "user_id" uuid, "user_cancelled" boolean NOT NULL DEFAULT false, "ended_at" bigint, "razorpaySubscriptionId" character varying, "razorpayPaymentId" character varying, "cancelledAt" TIMESTAMP, "isTrial" boolean NOT NULL DEFAULT false, "trialEndDate" TIMESTAMP, CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "narrators" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying, "email" character varying, "phone" numeric, "social" json, "languages" json, "userId" uuid NOT NULL, "chapterCoverURL" character varying, CONSTRAINT "PK_0e2ef7326ba840d281a4ce58515" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "story_casts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "story_id" character varying, "name" character varying, "role" character varying NOT NULL, "picture" character varying, "cast_id" character varying NOT NULL, CONSTRAINT "PK_38b5fda23599bbd7ad4b8021caf" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "cast_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "bio" character varying, "picture" character varying, CONSTRAINT "PK_bbe40a8b3f826f5493e3b082674" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "authors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying, "bio" character varying, "picture" character varying, CONSTRAINT "PK_d2ed02fabd9b52847ccb85e6b88" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" ADD CONSTRAINT "FK_b5d0e1b57bc6c761fb49e79bf89" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" ADD CONSTRAINT "FK_3d55ec3da7d462ec8c29dab401f" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" ADD CONSTRAINT "FK_219170359a4b47df749c5f87358" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_bookmarks" ADD CONSTRAINT "FK_c484214b48e72166fffd0208f4b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_bookmarks" ADD CONSTRAINT "FK_11a480985cdf9c56fae94553b50" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_bookmarks" ADD CONSTRAINT "FK_dcf96ea5af334a45ebdafb6c3c2" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "FK_5cf992b9dd708a70e97bbdf578c" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "book_ratings" ADD CONSTRAINT "FK_854de1dea5054fce70de352c10f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "book_ratings" ADD CONSTRAINT "FK_b39edd0d2bffb778c8a08be7cc4" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "audiobook_listeners" ADD CONSTRAINT "FK_c3e2bf2cf3c16cef04b31e5fbc4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "audiobook_listeners" ADD CONSTRAINT "FK_091d0e8a9b1dca79aad74b3ad60" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "books" ADD CONSTRAINT "FK_a0f13454de3df36e337e01dbd55" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_c6065536f2f6de3a0163e19a584" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_2c733d2b9f99ec2b765e3799f3d" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "feedbacks" ADD CONSTRAINT "FK_4334f6be2d7d841a9d5205a100e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_427785468fb7d2733f59e7d7d39" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_f9b6a4c3196864cdd91b1a440ee" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "narrators" ADD CONSTRAINT "FK_54e1303438bdefd2c1246850f07" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "narrators" DROP CONSTRAINT "FK_54e1303438bdefd2c1246850f07"`
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc"`
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1"`
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_f9b6a4c3196864cdd91b1a440ee"`
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_427785468fb7d2733f59e7d7d39"`
    );
    await queryRunner.query(
      `ALTER TABLE "feedbacks" DROP CONSTRAINT "FK_4334f6be2d7d841a9d5205a100e"`
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_2c733d2b9f99ec2b765e3799f3d"`
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_c6065536f2f6de3a0163e19a584"`
    );
    await queryRunner.query(
      `ALTER TABLE "books" DROP CONSTRAINT "FK_a0f13454de3df36e337e01dbd55"`
    );
    await queryRunner.query(
      `ALTER TABLE "audiobook_listeners" DROP CONSTRAINT "FK_091d0e8a9b1dca79aad74b3ad60"`
    );
    await queryRunner.query(
      `ALTER TABLE "audiobook_listeners" DROP CONSTRAINT "FK_c3e2bf2cf3c16cef04b31e5fbc4"`
    );
    await queryRunner.query(
      `ALTER TABLE "book_ratings" DROP CONSTRAINT "FK_b39edd0d2bffb778c8a08be7cc4"`
    );
    await queryRunner.query(
      `ALTER TABLE "book_ratings" DROP CONSTRAINT "FK_854de1dea5054fce70de352c10f"`
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "FK_5cf992b9dd708a70e97bbdf578c"`
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_bookmarks" DROP CONSTRAINT "FK_dcf96ea5af334a45ebdafb6c3c2"`
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_bookmarks" DROP CONSTRAINT "FK_11a480985cdf9c56fae94553b50"`
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_bookmarks" DROP CONSTRAINT "FK_c484214b48e72166fffd0208f4b"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" DROP CONSTRAINT "FK_219170359a4b47df749c5f87358"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" DROP CONSTRAINT "FK_3d55ec3da7d462ec8c29dab401f"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" DROP CONSTRAINT "FK_b5d0e1b57bc6c761fb49e79bf89"`
    );
    await queryRunner.query(`DROP TABLE "authors"`);
    await queryRunner.query(`DROP TABLE "cast_members"`);
    await queryRunner.query(`DROP TABLE "story_casts"`);
    await queryRunner.query(`DROP TABLE "narrators"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "plans"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "feedbacks"`);
    await queryRunner.query(`DROP TABLE "bookmarks"`);
    await queryRunner.query(`DROP TABLE "books"`);
    await queryRunner.query(`DROP TABLE "audiobook_listeners"`);
    await queryRunner.query(`DROP TABLE "book_ratings"`);
    await queryRunner.query(`DROP TABLE "chapters"`);
    await queryRunner.query(`DROP TABLE "chapter_bookmarks"`);
    await queryRunner.query(`DROP TABLE "user_progress"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
