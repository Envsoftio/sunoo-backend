import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSleepSounds1765900000000 implements MigrationInterface {
  name = 'AddSleepSounds1765900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sleep_sound_categories table
    await queryRunner.query(`
      CREATE TABLE "sleep_sound_categories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "icon" character varying(500),
        "priority" integer DEFAULT 0,
        "is_published" boolean DEFAULT true,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      )
    `);

    // Create sleep_sounds table
    await queryRunner.query(`
      CREATE TABLE "sleep_sounds" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "description" text,
        "audio_url" character varying(500) NOT NULL,
        "duration_seconds" integer DEFAULT 0,
        "file_size_bytes" bigint DEFAULT 0,
        "mime_type" character varying(50) DEFAULT 'audio/mpeg',
        "category_id" uuid NOT NULL,
        "priority" integer DEFAULT 0,
        "is_published" boolean DEFAULT true,
        "is_premium" boolean DEFAULT false,
        "tags" jsonb,
        "mood" character varying(50),
        "intensity" character varying(50),
        "play_count" integer DEFAULT 0,
        "unique_listeners" integer DEFAULT 0,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now(),
        CONSTRAINT "fk_sleep_sound_category" FOREIGN KEY ("category_id")
          REFERENCES "sleep_sound_categories"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for sleep_sounds
    await queryRunner.query(
      `CREATE INDEX "idx_sleep_sounds_priority" ON "sleep_sounds"("priority")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sleep_sounds_is_published" ON "sleep_sounds"("is_published")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sleep_sounds_category_id" ON "sleep_sounds"("category_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sleep_sounds_play_count" ON "sleep_sounds"("play_count")`
    );

    // Create app_settings table
    await queryRunner.query(`
      CREATE TABLE "app_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "key" character varying(100) UNIQUE NOT NULL,
        "value" text NOT NULL,
        "description" text,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      )
    `);

    // Create sleep_sound_sessions table
    await queryRunner.query(`
      CREATE TABLE "sleep_sound_sessions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "started_at" timestamp with time zone NOT NULL,
        "ended_at" timestamp with time zone,
        "total_duration_seconds" integer DEFAULT 0,
        "sounds_played" jsonb NOT NULL,
        "timer_duration_minutes" integer,
        "completed_naturally" boolean DEFAULT false,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now(),
        CONSTRAINT "fk_sleep_session_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes for sleep_sound_sessions
    await queryRunner.query(
      `CREATE INDEX "idx_sleep_sessions_user_started" ON "sleep_sound_sessions"("user_id", "started_at")`
    );

    // Create sleep_sound_analytics table
    await queryRunner.query(`
      CREATE TYPE "analytics_event_type" AS ENUM ('play', 'pause', 'stop', 'timer_stop', 'complete')
    `);

    await queryRunner.query(`
      CREATE TABLE "sleep_sound_analytics" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "sound_id" uuid NOT NULL,
        "session_id" uuid NOT NULL,
        "event_type" analytics_event_type NOT NULL,
        "duration_listened_seconds" integer DEFAULT 0,
        "volume_level" real DEFAULT 1.0,
        "timer_duration_minutes" integer,
        "device_info" jsonb,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now(),
        CONSTRAINT "fk_sleep_analytics_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_sleep_analytics_sound" FOREIGN KEY ("sound_id")
          REFERENCES "sleep_sounds"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for sleep_sound_analytics
    await queryRunner.query(
      `CREATE INDEX "idx_sleep_analytics_user_created" ON "sleep_sound_analytics"("user_id", "created_at")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sleep_analytics_sound_created" ON "sleep_sound_analytics"("sound_id", "created_at")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sleep_analytics_session" ON "sleep_sound_analytics"("session_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sleep_analytics_event_type" ON "sleep_sound_analytics"("event_type")`
    );

    // Create user_sound_mixes table
    await queryRunner.query(`
      CREATE TABLE "user_sound_mixes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" character varying(200) NOT NULL,
        "description" text,
        "mix_data" jsonb NOT NULL,
        "is_favorite" boolean DEFAULT false,
        "play_count" integer DEFAULT 0,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now(),
        CONSTRAINT "fk_user_mix_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for user_sound_mixes
    await queryRunner.query(
      `CREATE INDEX "idx_user_mixes_user_created" ON "user_sound_mixes"("user_id", "created_at")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_mixes_is_favorite" ON "user_sound_mixes"("is_favorite")`
    );

    // Create predefined_sound_mixes table
    await queryRunner.query(`
      CREATE TABLE "predefined_sound_mixes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "description" text,
        "cover_image" character varying(500),
        "mix_data" jsonb NOT NULL,
        "category" character varying(100),
        "is_premium" boolean DEFAULT false,
        "priority" integer DEFAULT 0,
        "is_published" boolean DEFAULT true,
        "play_count" integer DEFAULT 0,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      )
    `);

    // Create indexes for predefined_sound_mixes
    await queryRunner.query(
      `CREATE INDEX "idx_predefined_mixes_priority" ON "predefined_sound_mixes"("priority")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_predefined_mixes_is_published" ON "predefined_sound_mixes"("is_published")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_predefined_mixes_play_count" ON "predefined_sound_mixes"("play_count")`
    );

    // Seed initial app_settings
    await queryRunner.query(`
      INSERT INTO "app_settings" ("key", "value", "description") VALUES
      ('free_sleep_sounds_limit', '5', 'Number of sleep sounds available to free users'),
      ('max_simultaneous_sounds', '5', 'Maximum number of sounds that can play simultaneously'),
      ('search_filter_premium_only', 'true', 'Whether search and filter features are premium-only'),
      ('premium_sleep_sounds_enabled', 'true', 'Whether premium sleep sounds feature is enabled')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(
      `DROP TABLE IF EXISTS "predefined_sound_mixes" CASCADE`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sound_mixes" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "sleep_sound_analytics" CASCADE`
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "analytics_event_type"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "sleep_sound_sessions" CASCADE`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "app_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sleep_sounds" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "sleep_sound_categories" CASCADE`
    );
  }
}
