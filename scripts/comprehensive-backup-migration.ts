import { readFileSync, readdirSync } from 'fs';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

function findBackupFile(): string {
  try {
    const files = readdirSync('.');
    const backupFile = files.find(
      (file) => file.startsWith('db_cluster-') && file.endsWith('.backup'),
    );

    if (!backupFile) {
      throw new Error('No backup file found with pattern db_cluster-*.backup');
    }

    console.log(`📁 Found backup file: ${backupFile}`);
    return backupFile;
  } catch (error) {
    throw new Error(`Error finding backup file: ${error.message}`);
  }
}

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'sunoo_backend',
  entities: ['src/entities/*.entity.ts'],
  synchronize: false,
  logging: false,
});

interface TableData {
  name: string;
  columns: string[];
  data: any[][];
}

// Table mapping from backup names to current database names
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
  User: {
    id: 'id',
    created_at: 'created_at',
    name: 'name',
    email: 'email',
    isAuthenticated: 'is_active',
    role: 'role',
    language: 'language',
    imageURL: 'avatar',
    authId: 'provider',
    bio: 'bio',
    availedTrial: 'is_email_verified',
    country: 'country',
    email_notifications_enabled: 'email_notifications_enabled',
    marketing_emails_enabled: 'marketing_emails_enabled',
    new_content_emails_enabled: 'new_content_emails_enabled',
    subscription_emails_enabled: 'subscription_emails_enabled',
    email_preferences_updated_at: 'email_preferences_updated_at',
  },
  Category: {
    id: 'id',
    created_at: 'created_at',
    name: 'name',
    slug: 'slug',
    description: 'description',
    icon_url: 'icon_url',
    color: 'color',
    is_active: 'is_active',
    sort_order: 'sort_order',
    updated_at: 'updated_at',
    featured: 'featured',
  },
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
    playbackTime: 'duration',
    bookId: 'book_id',
    chapterUrl: 'audio_url',
    order: 'chapter_order',
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
    bookId: 'book_id',
    userId: 'user_id',
  },
  BookRatings: {
    id: 'id',
    created_at: 'created_at',
    bookId: 'book_id',
    userId: 'user_id',
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
    start_date: 'start_date',
    end_date: 'end_date',
    status: 'status',
    next_billing_date: 'next_billing_date',
    metadata: 'metadata',
    user_id: 'user_id',
    updated_at: 'updated_at',
    user_cancelled: 'user_cancelled',
    ended_at: 'ended_at',
  },
  Payments: {
    id: 'id',
    created_at: 'created_at',
    invoice_id: 'invoice_id',
    plan_id: 'plan_id',
    currency: 'currency',
    status: 'status',
    metadata: 'metadata',
    payment_id: 'payment_id',
    amount: 'amount',
    user_id: 'user_id',
    subscription_id: 'subscription_id',
  },
  Plans: {
    id: 'id',
    created_at: 'created_at',
    planName: 'name',
    razorpayPlanId: 'razorpay_plan_id',
    currency: 'currency',
    amount: 'amount',
    liveMode: 'is_live',
    description: 'description',
    frequency: 'frequency',
  },
  AudiobookListeners: {
    id: 'id',
    created_at: 'created_at',
    userId: 'user_id',
    bookId: 'book_id',
  },
  ChapterBookmarks: {
    id: 'id',
    created_at: 'created_at',
    bookId: 'book_id',
    userId: 'user_id',
    chapterId: 'chapter_id',
    bookmarkText: 'note',
    audioTimeStamp: 'timestamp',
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

function parseTableData(backupContent: string, tableName: string): any[][] {
  try {
    // Look for COPY statement for the table (with quotes)
    const copyPattern = new RegExp(
      `COPY public\\.\\"${tableName}\\"[^\\n]*\\n([\\s\\S]*?)\\n\\\\.`,
      'g',
    );
    const match = copyPattern.exec(backupContent);

    if (!match || !match[1]) {
      console.log(`⚠️ No data found for table: ${tableName}`);
      return [];
    }

    const dataSection = match[1].trim();
    const lines = dataSection
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('--'));

    const data: any[][] = [];
    for (const line of lines) {
      // Parse tab-separated values
      const values = line.split('\t');
      const parsedValues = values.map((value) => {
        if (value === '\\N' || value === '') return null;

        // Try to parse as number
        if (!isNaN(Number(value)) && value !== '') {
          return Number(value);
        }

        // Try to parse as boolean
        if (value === 't' || value === 'f') {
          return value === 't';
        }

        // Try to parse as date
        if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
          return new Date(value).toISOString();
        }

        // Return as string
        return value;
      });

      data.push(parsedValues);
    }

    return data;
  } catch (error) {
    console.error(`❌ Error parsing data for ${tableName}:`, error.message);
    return [];
  }
}

function getTableColumns(backupContent: string, tableName: string): string[] {
  try {
    // Look for COPY statement which has the correct column order
    const copyPattern = new RegExp(
      `COPY public\\.\\"${tableName}\\"\\s*\\(([^)]+)\\)`,
      'g',
    );
    const match = copyPattern.exec(backupContent);

    if (!match || !match[1]) {
      console.log(`⚠️ No COPY statement found for table: ${tableName}`);
      return [];
    }

    // Parse the column list from COPY statement
    const columnList = match[1];
    const columns = columnList
      .split(',')
      .map((col) => col.trim().replace(/"/g, ''))
      .filter(Boolean);

    return columns;
  } catch (error) {
    console.error(`❌ Error getting columns for ${tableName}:`, error.message);
    return [];
  }
}

async function migrateTableData(
  tableName: string,
  data: any[][],
  columns: string[],
) {
  if (data.length === 0) {
    console.log(`⏭️ Skipping ${tableName} - no data`);
    return;
  }

  const currentTableName =
    TABLE_MAPPING[tableName as keyof typeof TABLE_MAPPING];
  if (!currentTableName) {
    console.log(`⚠️ No mapping found for table: ${tableName}`);
    return;
  }

  const columnMapping =
    COLUMN_MAPPING[tableName as keyof typeof COLUMN_MAPPING];
  if (!columnMapping) {
    console.log(`⚠️ No column mapping found for table: ${tableName}`);
    return;
  }

  console.log(
    `\n🔄 Migrating ${tableName} -> ${currentTableName} (${data.length} records)...`,
  );

  try {
    // Get current table columns
    const currentColumns = await dataSource.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = '${currentTableName}'
      ORDER BY ordinal_position;
    `);
    const currentColumnNames = currentColumns.map((c) => c.column_name);

    // Get existing records to avoid duplicates
    const existingRecords = await dataSource.query(
      `SELECT id FROM ${currentTableName}`,
    );
    const existingIds = new Set(existingRecords.map((r) => r.id));

    let newRecords = 0;
    let updatedRecords = 0;
    let skippedRecords = 0;

    // Process each record
    for (const record of data) {
      const mappedRecord: any = {};

      // Map columns
      for (let i = 0; i < columns.length && i < record.length; i++) {
        const backupColumn = columns[i];
        const currentColumn =
          columnMapping[backupColumn as keyof typeof columnMapping];

        if (currentColumn && currentColumnNames.includes(currentColumn)) {
          mappedRecord[currentColumn] = record[i];
        }
      }

      // Skip if no ID or if record already exists and we're not updating
      if (!mappedRecord.id) {
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

      // Handle null values for required fields
      if (currentTableName === 'users') {
        if (!mappedRecord.name) mappedRecord.name = 'Unknown User';
        if (!mappedRecord.email)
          mappedRecord.email = `user-${record[0] || 'unknown'}@example.com`;
        if (!mappedRecord.password) mappedRecord.password = 'default_password';
      }
      if (currentTableName === 'categories') {
        if (!mappedRecord.name) mappedRecord.name = 'Unnamed Category';
        if (!mappedRecord.slug)
          mappedRecord.slug = `category-${record[0] || 'unknown'}`;
      }
      if (currentTableName === 'books') {
        if (!mappedRecord.title) mappedRecord.title = 'Untitled Book';
        if (!mappedRecord.slug)
          mappedRecord.slug = `book-${record[0] || 'unknown'}`;
      }
      if (currentTableName === 'chapters') {
        if (!mappedRecord.name) mappedRecord.name = 'Chapter';
      }
      if (currentTableName === 'narrators' && !mappedRecord.userId) {
        mappedRecord.userId = null; // Make it nullable
      }
      if (currentTableName === 'user_progress' && !mappedRecord.userId) {
        mappedRecord.userId = record[0]; // Use the first column as userId
      }
      if (
        currentTableName === 'chapter_bookmarks' &&
        mappedRecord.timestamp &&
        typeof mappedRecord.timestamp === 'string'
      ) {
        // Convert string timestamp to integer if possible
        const timestamp = parseInt(mappedRecord.timestamp);
        if (!isNaN(timestamp)) {
          mappedRecord.timestamp = timestamp;
        } else {
          mappedRecord.timestamp = 0; // Default to 0 if not a valid number
        }
      }

      // Validate UUID fields
      const uuidFields = ['id', 'userId', 'bookId', 'chapterId', 'categoryId'];
      for (const field of uuidFields) {
        if (mappedRecord[field] && typeof mappedRecord[field] === 'string') {
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

      // Insert or update record
      const insertColumns = Object.keys(mappedRecord);
      const insertValues = insertColumns.map(
        (col) => `$${insertColumns.indexOf(col) + 1}`,
      );
      const values = insertColumns.map((col) => mappedRecord[col]);

      if (recordExists) {
        // Update existing record
        const updateColumns = insertColumns.filter((col) => col !== 'id');
        const updateValues = updateColumns
          .map((col) => `${col} = $${insertColumns.indexOf(col) + 1}`)
          .join(', ');

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
        // Insert new record
        const quotedColumns = insertColumns.map((col) => `"${col}"`).join(', ');
        const query = `
          INSERT INTO ${currentTableName} (${quotedColumns})
          VALUES (${insertValues.join(', ')})
        `;

        await dataSource.query(query, values);
        newRecords++;
      }
    }

    console.log(
      `✅ ${currentTableName}: ${newRecords} new, ${updatedRecords} updated, ${skippedRecords} skipped`,
    );
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error.message);
  }
}

async function comprehensiveMigration() {
  try {
    await dataSource.initialize();
    console.log('🚀 Starting comprehensive backup migration...\n');

    // Find and read backup file dynamically
    const backupFileName = findBackupFile();
    const backupContent = readFileSync(backupFileName, 'utf8');

    // Get all table names from backup
    const tableDefinitions =
      backupContent.match(/CREATE TABLE public\."([^"]+)"[^;]+;/g) || [];
    const backupTableNames = tableDefinitions
      .map((def) => def.match(/CREATE TABLE public\."([^"]+)"/)?.[1])
      .filter(Boolean) as string[];

    console.log(`📋 Found ${backupTableNames.length} tables in backup file`);

    // Process each table
    for (const tableName of backupTableNames) {
      if (!TABLE_MAPPING[tableName as keyof typeof TABLE_MAPPING]) {
        console.log(`⏭️ Skipping unmapped table: ${tableName}`);
        continue;
      }

      const columns = getTableColumns(backupContent, tableName);
      const data = parseTableData(backupContent, tableName);

      await migrateTableData(tableName, data, columns);
    }

    // Final summary
    console.log('\n📊 Final Database Summary:');
    for (const [backupName, currentName] of Object.entries(TABLE_MAPPING)) {
      try {
        const count = await dataSource.query(
          `SELECT COUNT(*) as count FROM ${currentName}`,
        );
        console.log(`  ${currentName}: ${count[0].count} records`);
      } catch (error) {
        console.log(`  ${currentName}: Error - ${error.message}`);
      }
    }

    console.log('\n🎉 Comprehensive migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await dataSource.destroy();
  }
}

comprehensiveMigration();
