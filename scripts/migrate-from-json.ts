import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'sunoo_backend',
});

// Table name mapping from backup to current database
const TABLE_MAPPING = {
  User: 'users',
  Category: 'categories',
  Books: 'books',
  Authors: 'authors',
  Chapters: 'chapters',
  Narrator: 'narrators',
  Bookmarks: 'bookmarks',
  BookRatings: 'book_ratings',
  UserProgress: 'user_progress',
  Subscriptions: 'subscriptions',
  Payments: 'payments',
  Plans: 'plans',
  AudiobookListeners: 'audiobook_listeners',
  ChapterBookmarks: 'chapter_bookmarks',
  feedback: 'feedbacks',
  CastMembers: 'cast_members',
  StoryCasts: 'story_casts',
};

// Column mapping for each table
const COLUMN_MAPPING = {
  Books: {
    id: 'id',
    created_at: 'created_at',
    title: 'title',
    bookCoverUrl: 'bookCoverUrl',
    language: 'language',
    bookDescription: 'bookDescription',
    duration: 'duration',
    isPublished: 'isPublished',
    category: 'categoryId',
    isFree: 'isFree',
    contentRating: 'contentRating',
    tags: 'tags',
    slug: 'slug',
  },
  User: {
    id: 'id',
    created_at: 'created_at',
    name: 'name',
    email: 'email',
    password: 'password',
    picture: 'picture',
    isAuthenticated: 'isAuthenticated',
    role: 'role',
    isEmailVerified: 'isEmailVerified',
    emailVerificationCode: 'emailVerificationCode',
    emailVerificationExpires: 'emailVerificationExpires',
    passwordResetCode: 'passwordResetCode',
    passwordResetExpires: 'passwordResetExpires',
    lastLoginAt: 'lastLoginAt',
    loginAttempts: 'loginAttempts',
    lockedUntil: 'lockedUntil',
  },
  Category: {
    id: 'id',
    created_at: 'created_at',
    name: 'name',
    slug: 'slug',
    description: 'description',
    is_active: 'is_active',
    sort_order: 'sort_order',
    updated_at: 'updated_at',
    featured: 'featured',
  },
  Authors: {
    id: 'id',
    created_at: 'created_at',
    name: 'name',
    bio: 'bio',
    picture: 'picture',
  },
  Chapters: {
    id: 'id',
    created_at: 'created_at',
    name: 'name',
    bookId: 'bookId',
    duration: 'duration',
    audioUrl: 'audioUrl',
    order: 'order',
  },
  Narrator: {
    id: 'id',
    created_at: 'created_at',
    name: 'name',
    email: 'email',
    phone: 'phone',
    social: 'social',
    languages: 'languages',
    userId: 'userId',
    chapterCoverURL: 'avatar',
  },
  Bookmarks: {
    id: 'id',
    created_at: 'created_at',
    bookId: 'bookId',
    userId: 'userId',
    rating: 'rating',
    comment: 'comment',
  },
  BookRatings: {
    id: 'id',
    created_at: 'created_at',
    bookId: 'bookId',
    userId: 'userId',
    rating: 'rating',
    comment: 'comment',
  },
  UserProgress: {
    id: 'id',
    created_at: 'created_at',
    userId: 'userId',
    bookId: 'bookId',
    chapterId: 'chapterId',
    totalNumberOfReadingTimes: 'total_listens',
    progress_time: 'progress_time',
    updated_at: 'updated_at',
  },
  Subscriptions: {
    id: 'id',
    created_at: 'created_at',
    subscription_id: 'subscription_id',
    plan_id: 'plan_id',
    user_id: 'user_id',
    status: 'status',
    start_date: 'start_date',
    end_date: 'end_date',
    next_billing_date: 'next_billing_date',
    metadata: 'metadata',
    user_cancelled: 'user_cancelled',
    ended_at: 'ended_at',
    razorpaySubscriptionId: 'razorpaySubscriptionId',
    razorpayPaymentId: 'razorpayPaymentId',
    cancelledAt: 'cancelledAt',
    isTrial: 'isTrial',
    trialEndDate: 'trialEndDate',
  },
  Payments: {
    id: 'id',
    created_at: 'created_at',
    amount: 'transaction_id', // JSON has transaction_id as the amount value
    currency: 'currency', // This will be null since currency field contains "authorized"
    status: 'currency', // JSON has currency field with "authorized" value (this is actually status)
    payment_id: 'payment_method', // JSON has payment_method as the payment_id
    invoice_id: 'user_id', // JSON has user_id field with invoice IDs like "inv_Ps1hdGK0YJ3oq8"
    plan_id: 'plan_id',
    user_id: 'user_id', // This will be null since user_id contains invoice IDs
    subscription_id: 'subscription_id', // This field doesn't exist in JSON, will be null
    metadata: 'status', // JSON has status field with JSON object (this is metadata)
  },
  Plans: {
    id: 'id',
    created_at: 'created_at',
    name: 'planName',
    description: 'description',
    amount: 'amount',
    currency: 'currency',
    interval: 'frequency',
    interval_count: 'interval_count',
    trial_period_days: 'trial_period_days',
    metadata: 'metadata',
    razorpayPlanId: 'razorpayPlanId',
    liveMode: 'liveMode',
  },
  AudiobookListeners: {
    id: 'id',
    created_at: 'created_at',
    userId: 'userId',
    bookId: 'bookId',
  },
  ChapterBookmarks: {
    id: 'id',
    created_at: 'created_at',
    bookId: 'bookId',
    userId: 'userId',
    chapterId: 'chapterId',
    bookmarkText: 'bookmarkText',
    audioTimeStamp: 'audioTimeStamp',
    timestamp: 'timestamp',
    note: 'note',
  },
  feedback: {
    id: 'id',
    created_at: 'created_at',
    user_id: 'user_id',
    book_id: 'book_id',
    rating: 'rating',
    comment: 'comment',
    status: 'status',
  },
  CastMembers: {
    id: 'id',
    created_at: 'created_at',
    name: 'name',
    bio: 'bio',
    picture: 'picture',
  },
  StoryCasts: {
    id: 'id',
    created_at: 'created_at',
    story_id: 'story_id',
    name: 'name',
    role: 'role',
    picture: 'picture',
    cast_id: 'cast_id',
  },
};

async function migrateFromJson() {
  try {
    await dataSource.initialize();
    console.log('🚀 Starting migration from JSON file...\n');

    // Read the JSON file
    const jsonContent = readFileSync(
      'backups/supabase-backup-converted.json',
      'utf8',
    );
    const backupData = JSON.parse(jsonContent);

    console.log(
      `📊 Found ${Object.keys(backupData.tables).length} tables in JSON file`,
    );

    // Process each table
    for (const [tableName, records] of Object.entries(backupData.tables)) {
      const currentTableName =
        TABLE_MAPPING[tableName as keyof typeof TABLE_MAPPING];

      if (!currentTableName) {
        console.log(`⚠️ No mapping found for table: ${tableName}`);
        continue;
      }

      if (!Array.isArray(records) || records.length === 0) {
        console.log(`⏭️ Skipping ${tableName} - no data`);
        continue;
      }

      console.log(
        `\n🔄 Migrating ${tableName} -> ${currentTableName} (${records.length} records)...`,
      );

      const columnMapping =
        COLUMN_MAPPING[tableName as keyof typeof COLUMN_MAPPING];
      if (!columnMapping) {
        console.log(`⚠️ No column mapping found for table: ${tableName}`);
        continue;
      }

      // Get current table columns
      const currentColumns = await dataSource.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${currentTableName}'
        ORDER BY ordinal_position;
      `);
      const currentColumnNames = currentColumns.map((c) => c.column_name);

      // Debug logging for Payments table
      if (currentTableName === 'payments') {
        console.log(`🔍 Debug: Payments table columns:`, currentColumnNames);
        console.log(`🔍 Debug: Payments column mapping:`, columnMapping);
      }

      // Get existing records to avoid duplicates
      const existingRecords = await dataSource.query(
        `SELECT id FROM ${currentTableName}`,
      );
      const existingIds = new Set(existingRecords.map((r) => r.id));

      let newRecords = 0;
      let updatedRecords = 0;
      let skippedRecords = 0;

      // Process each record
      for (const record of records) {
        const mappedRecord: any = {};

        // Debug logging for Payments table
        if (currentTableName === 'payments' && records.indexOf(record) === 0) {
          console.log(
            `🔍 Debug: First Payments record fields:`,
            Object.keys(record),
          );
          console.log(
            `🔍 Debug: First Payments record transaction_id:`,
            record.transaction_id,
          );
        }

        // Map columns
        for (const [backupColumn, currentColumn] of Object.entries(
          columnMapping,
        )) {
          if (
            record[backupColumn] !== undefined &&
            currentColumnNames.includes(currentColumn)
          ) {
            let value = record[backupColumn];
            // Handle PostgreSQL NULL representation
            if (value === '\\N' || value === null) {
              value = null;
            }
            mappedRecord[currentColumn] = value;

            // Debug logging for Payments table
            if (
              currentTableName === 'payments' &&
              backupColumn === 'transaction_id'
            ) {
              console.log(
                `🔍 Debug: transaction_id = ${value}, mapped to amount = ${mappedRecord[currentColumn]}`,
              );
            }
            if (currentTableName === 'payments' && currentColumn === 'amount') {
              console.log(
                `🔍 Debug: amount column mapping - backupColumn: ${backupColumn}, currentColumn: ${currentColumn}, value: ${value}`,
              );
            }
          }
        }

        // Skip if no ID or if record already exists
        if (
          !mappedRecord.id ||
          mappedRecord.id === '\\N' ||
          mappedRecord.id === null
        ) {
          skippedRecords++;
          continue;
        }

        const recordExists = existingIds.has(mappedRecord.id);

        // Add required fields if missing
        if (!mappedRecord.created_at) {
          mappedRecord.created_at = new Date().toISOString();
        }
        if (!mappedRecord.updated_at) {
          mappedRecord.updated_at = new Date().toISOString();
        }

        // Validate UUID fields (skip for tables with integer IDs)
        if (
          currentTableName !== 'payments' &&
          currentTableName !== 'user_progress'
        ) {
          const uuidFields = [
            'id',
            'userId',
            'bookId',
            'chapterId',
            'categoryId',
          ];
          for (const field of uuidFields) {
            if (
              mappedRecord[field] &&
              typeof mappedRecord[field] === 'string'
            ) {
              // Check if it's a valid UUID format
              const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              if (!uuidRegex.test(mappedRecord[field])) {
                // Skip this record if UUID is invalid
                console.log(
                  `⚠️ Skipping record with invalid UUID in field ${field}: ${mappedRecord[field]}`,
                );
                skippedRecords++;
                continue;
              }
            }
          }
        } else {
          // For payments and user_progress tables, only validate UUID fields (not the integer id)
          const uuidFields = ['userId', 'bookId', 'chapterId', 'categoryId'];
          for (const field of uuidFields) {
            if (
              mappedRecord[field] &&
              typeof mappedRecord[field] === 'string'
            ) {
              // Check if it's a valid UUID format
              const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              if (!uuidRegex.test(mappedRecord[field])) {
                // Skip this record if UUID is invalid
                console.log(
                  `⚠️ Skipping record with invalid UUID in field ${field}: ${mappedRecord[field]}`,
                );
                skippedRecords++;
                continue;
              }
            }
          }
        }

        // Handle special cases for Payments table
        if (currentTableName === 'payments') {
          // Validate plan_id is a valid UUID, set to null if not
          if (
            mappedRecord.plan_id &&
            typeof mappedRecord.plan_id === 'string'
          ) {
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(mappedRecord.plan_id)) {
              console.log(
                `⚠️ Invalid plan_id format in payment: ${mappedRecord.plan_id}, setting to null`,
              );
              mappedRecord.plan_id = null;
            }
          }
          // Validate user_id is a valid UUID, set to null if not
          if (
            mappedRecord.user_id &&
            typeof mappedRecord.user_id === 'string'
          ) {
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(mappedRecord.user_id)) {
              console.log(
                `⚠️ Invalid user_id format in payment: ${mappedRecord.user_id}, setting to null`,
              );
              mappedRecord.user_id = null;
            }
          }
          // subscription_id is varchar, so no validation needed
        }

        // Handle special cases for Subscriptions table
        if (currentTableName === 'subscriptions') {
          // Validate plan_id is a valid UUID, set to null if not
          if (
            mappedRecord.plan_id &&
            typeof mappedRecord.plan_id === 'string'
          ) {
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(mappedRecord.plan_id)) {
              console.log(
                `⚠️ Invalid plan_id format in subscription: ${mappedRecord.plan_id}, setting to null`,
              );
              mappedRecord.plan_id = null;
            }
          }
          // Validate user_id is a valid UUID, set to null if not
          if (
            mappedRecord.user_id &&
            typeof mappedRecord.user_id === 'string'
          ) {
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(mappedRecord.user_id)) {
              console.log(
                `⚠️ Invalid user_id format in subscription: ${mappedRecord.user_id}, setting to null`,
              );
              mappedRecord.user_id = null;
            }
          }
        }

        // Handle null values for required fields
        if (currentTableName === 'users') {
          if (!mappedRecord.name) mappedRecord.name = 'Unknown User';
          if (!mappedRecord.email)
            mappedRecord.email = `user-${record.id}@example.com`;
          if (!mappedRecord.password)
            mappedRecord.password = 'default_password';
        }
        if (currentTableName === 'categories') {
          if (!mappedRecord.name) mappedRecord.name = 'Unnamed Category';
          if (!mappedRecord.slug) mappedRecord.slug = `category-${record.id}`;
        }
        if (currentTableName === 'books') {
          if (!mappedRecord.title) mappedRecord.title = 'Untitled Book';
          if (!mappedRecord.slug) mappedRecord.slug = `book-${record.id}`;
        }

        // Insert or update record
        const insertColumns = Object.keys(mappedRecord);
        const insertValues = insertColumns.map(
          (col) => `$${insertColumns.indexOf(col) + 1}`,
        );
        const values = insertColumns.map((col) => mappedRecord[col]);

        if (recordExists) {
          // Update existing record
          const updateColumns = insertColumns.filter((col) => col !== 'id');
          const quotedUpdateValues = updateColumns
            .map((col) => `"${col}" = $${insertColumns.indexOf(col) + 1}`)
            .join(', ');
          const query = `
            UPDATE ${currentTableName}
            SET ${quotedUpdateValues}
            WHERE "id" = $${insertColumns.indexOf('id') + 1}
          `;
          await dataSource.query(query, values);
          updatedRecords++;
        } else {
          // Insert new record with conflict handling
          const quotedColumns = insertColumns
            .map((col) => `"${col}"`)
            .join(', ');
          const updateColumns = insertColumns.filter((col) => col !== 'id');
          const quotedUpdateValues = updateColumns
            .map((col) => `"${col}" = EXCLUDED."${col}"`)
            .join(', ');

          const query = `
            INSERT INTO ${currentTableName} (${quotedColumns})
            VALUES (${insertValues.join(', ')})
            ON CONFLICT (id) DO UPDATE SET ${quotedUpdateValues}
          `;

          try {
            await dataSource.query(query, values);
            newRecords++;
          } catch (error) {
            if (
              error.message.includes(
                'duplicate key value violates unique constraint',
              )
            ) {
              console.log(
                `⚠️ Skipping duplicate record with ID: ${mappedRecord.id}`,
              );
              skippedRecords++;
            } else {
              throw error;
            }
          }
        }
      }

      console.log(
        `✅ ${currentTableName}: ${newRecords} new, ${updatedRecords} updated, ${skippedRecords} skipped`,
      );
    }

    console.log('\n🎉 Migration from JSON completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

migrateFromJson();
