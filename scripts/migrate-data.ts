import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'sunoo_backend',
});

// Table name mapping from JSON filename to database table name
const TABLE_MAPPING = {
  'User.json': 'users',
  'Category.json': 'categories',
  'Books.json': 'books',
  'Chapters.json': 'chapters',
  'Bookmarks.json': 'bookmarks',
  'BookRatings.json': 'book_ratings',
  'UserProgress.json': 'user_progress',
  'Subscriptions.json': 'subscriptions',
  'Payments.json': 'payments',
  'Plans.json': 'plans',
  'AudiobookListeners.json': 'audiobook_listeners',
  'ChapterBookmarks.json': 'chapter_bookmarks',
  'feedback.json': 'feedbacks',
  'CastMembers.json': 'cast_members',
  'StoryCasts.json': 'story_casts',
};

// Special column mappings based on DDL analysis
const SPECIAL_COLUMN_MAPPINGS = {
  books: {
    category: 'categoryId', // DDL shows category -> categoryId
  },
  users: {
    imageURL: 'avatar', // DDL shows imageURL but our DB has avatar
  },
  book_ratings: {
    comment: 'comment', // Use comment column for comment field
    rating: 'rating', // Use rating column for rating field
  },
};

// Column mapping for each table (will be populated dynamically)
const COLUMN_MAPPING: Record<string, Record<string, string>> = {};

async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const columns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      ORDER BY ordinal_position;
    `);
    return columns.map(col => col.column_name);
  } catch (error) {
    console.error(`❌ Error getting columns for ${tableName}:`, error.message);
    return [];
  }
}

async function createColumnMapping(
  jsonFileName: string,
  tableName: string
): Promise<Record<string, string>> {
  const jsonPath = join('backups', jsonFileName);
  const jsonContent = readFileSync(jsonPath, 'utf8');
  const records = JSON.parse(jsonContent);

  if (!Array.isArray(records) || records.length === 0) {
    console.log(`⚠️ No data in ${jsonFileName}`);
    return {};
  }

  const sampleRecord = records[0];
  const jsonColumns = Object.keys(sampleRecord);
  const dbColumns = await getTableColumns(tableName);

  console.log(`📋 ${tableName} - JSON columns:`, jsonColumns);
  console.log(`📋 ${tableName} - DB columns:`, dbColumns);

  // Create mapping by matching column names (case-insensitive)
  const mapping: Record<string, string> = {};

  // Apply special mappings first
  const specialMappings = SPECIAL_COLUMN_MAPPINGS[tableName] || {};

  for (const jsonCol of jsonColumns) {
    // Check special mappings first
    if (specialMappings[jsonCol]) {
      mapping[jsonCol] = specialMappings[jsonCol];
      continue;
    }

    // Try exact match first
    let dbCol = dbColumns.find(dbCol => dbCol === jsonCol);

    // Try case-insensitive match
    if (!dbCol) {
      dbCol = dbColumns.find(
        dbCol => dbCol.toLowerCase() === jsonCol.toLowerCase()
      );
    }

    // Try camelCase to snake_case conversion
    if (!dbCol) {
      const snakeCase = jsonCol.replace(/([A-Z])/g, '_$1').toLowerCase();
      dbCol = dbColumns.find(dbCol => dbCol === snakeCase);
    }

    // Try snake_case to camelCase conversion
    if (!dbCol) {
      const camelCase = jsonCol.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      dbCol = dbColumns.find(dbCol => dbCol === camelCase);
    }

    if (dbCol) {
      mapping[jsonCol] = dbCol;
    } else {
      console.log(`⚠️ No matching DB column for JSON column: ${jsonCol}`);
    }
  }

  return mapping;
}

// Function to compare two records and check if they are similar
function areRecordsSimilar(
  record1: any,
  record2: any,
  excludeFields: string[] = ['created_at', 'updated_at']
): boolean {
  const keys1 = Object.keys(record1).filter(
    key => !excludeFields.includes(key)
  );
  const keys2 = Object.keys(record2).filter(
    key => !excludeFields.includes(key)
  );

  // If different number of keys, they're different
  if (keys1.length !== keys2.length) return false;

  // Compare each key
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;

    const val1 = record1[key];
    const val2 = record2[key];

    // Handle null/undefined comparison
    if ((val1 == null && val2 == null) || (val1 === '' && val2 === ''))
      continue;
    if (val1 == null || val2 == null) return false;

    // Handle date comparison
    if (val1 instanceof Date && val2 instanceof Date) {
      if (val1.getTime() !== val2.getTime()) return false;
      continue;
    }

    // Handle string comparison (case insensitive for most fields)
    if (typeof val1 === 'string' && typeof val2 === 'string') {
      if (key.toLowerCase().includes('email')) {
        if (val1.toLowerCase() !== val2.toLowerCase()) return false;
      } else if (
        key.toLowerCase().includes('name') ||
        key.toLowerCase().includes('title')
      ) {
        if (val1.trim().toLowerCase() !== val2.trim().toLowerCase())
          return false;
      } else {
        if (val1 !== val2) return false;
      }
      continue;
    }

    // Direct comparison for other types
    if (val1 !== val2) return false;
  }

  return true;
}

async function migrateFromIndividualJson() {
  try {
    await dataSource.initialize();
    console.log('🚀 Starting migration from individual JSON files...\n');

    // Get all JSON files in backups folder
    const backupsDir = 'backups';
    const jsonFiles = readdirSync(backupsDir).filter(file =>
      file.endsWith('.json')
    );

    console.log(`📁 Found ${jsonFiles.length} JSON files in backups folder`);

    // Define migration order to handle foreign key constraints
    const MIGRATION_ORDER = [
      'User.json', // No dependencies
      'Category.json', // No dependencies
      'CastMembers.json', // No dependencies
      'Plans.json', // No dependencies
      'Books.json', // Depends on Category
      'Chapters.json', // Depends on Books
      'Bookmarks.json', // Depends on User, Books
      'BookRatings.json', // Depends on User, Books
      'UserProgress.json', // Depends on User, Books, Chapters
      'Subscriptions.json', // Depends on User
      'Payments.json', // Depends on User, Plans
      'AudiobookListeners.json', // Depends on User, Books
      'ChapterBookmarks.json', // Depends on User, Books, Chapters
      'feedback.json', // Depends on User
      'StoryCasts.json', // Depends on Books, CastMembers
    ];

    // Process tables in dependency order
    for (const jsonFile of MIGRATION_ORDER) {
      if (!jsonFiles.includes(jsonFile)) {
        console.log(`⚠️ Skipping ${jsonFile} - file not found`);
        continue;
      }

      const tableName = TABLE_MAPPING[jsonFile as keyof typeof TABLE_MAPPING];

      if (!tableName) {
        console.log(`⚠️ No mapping found for file: ${jsonFile}`);
        continue;
      }

      console.log(`\n🔄 Processing ${jsonFile} -> ${tableName}...`);

      // Read JSON data
      const jsonPath = join(backupsDir, jsonFile);
      const jsonContent = readFileSync(jsonPath, 'utf8');
      const records = JSON.parse(jsonContent);

      if (!Array.isArray(records) || records.length === 0) {
        console.log(`⏭️ Skipping ${jsonFile} - no data`);
        continue;
      }

      // Create column mapping
      const columnMapping = await createColumnMapping(jsonFile, tableName);
      COLUMN_MAPPING[tableName] = columnMapping;

      // Get existing records to avoid duplicates
      const existingRecords = await dataSource.query(
        `SELECT * FROM ${tableName}`
      );
      const existingIds = new Set(existingRecords.map(r => r.id));

      // Create a map of existing records for content comparison
      const existingRecordsMap = new Map();
      existingRecords.forEach(record => {
        existingRecordsMap.set(record.id, record);
      });

      let newRecords = 0;
      let updatedRecords = 0;
      let skippedRecords = 0;

      // Process each record
      for (const record of records) {
        const mappedRecord: any = {};

        // Map columns
        for (const [jsonColumn, dbColumn] of Object.entries(columnMapping)) {
          if (record[jsonColumn] !== undefined) {
            let value = record[jsonColumn];
            // Handle PostgreSQL NULL representation
            if (value === '\\N' || value === null || value === '') {
              value = null;
            }
            mappedRecord[dbColumn] = value;
          }
        }

        // Skip if no ID
        if (
          !mappedRecord.id ||
          mappedRecord.id === '\\N' ||
          mappedRecord.id === null
        ) {
          skippedRecords++;
          continue;
        }

        const recordExists = existingIds.has(mappedRecord.id);
        let shouldSkip = false;

        // Add required fields if missing
        if (!mappedRecord.created_at) {
          mappedRecord.created_at = new Date().toISOString();
        }
        if (!mappedRecord.updated_at) {
          mappedRecord.updated_at = new Date().toISOString();
        }

        // Check if record already exists and is similar
        if (recordExists) {
          const existingRecord = existingRecordsMap.get(mappedRecord.id);
          if (areRecordsSimilar(mappedRecord, existingRecord)) {
            console.log(
              `⏭️ Skipping similar record with ID: ${mappedRecord.id}`
            );
            skippedRecords++;
            shouldSkip = true;
          }
        }

        // Validate UUID fields (skip for tables with integer IDs)
        if (tableName !== 'payments') {
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
              const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              if (!uuidRegex.test(mappedRecord[field])) {
                console.log(
                  `⚠️ Skipping record with invalid UUID in field ${field}: ${mappedRecord[field]}`
                );
                skippedRecords++;
                continue;
              }
            }
          }
        }

        // Handle special cases for specific tables
        if (tableName === 'payments') {
          // plan_id is varchar in DDL, so no UUID validation needed
          // Just ensure it's a string or null
          if (
            mappedRecord.plan_id &&
            typeof mappedRecord.plan_id !== 'string'
          ) {
            mappedRecord.plan_id = String(mappedRecord.plan_id);
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
                `⚠️ Invalid user_id format in payment: ${mappedRecord.user_id}, setting to null`
              );
              mappedRecord.user_id = null;
            }
          }
        }

        if (tableName === 'subscriptions') {
          // plan_id is varchar in DDL, so no UUID validation needed
          // Just ensure it's a string or null
          if (
            mappedRecord.plan_id &&
            typeof mappedRecord.plan_id !== 'string'
          ) {
            mappedRecord.plan_id = String(mappedRecord.plan_id);
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
                `⚠️ Invalid user_id format in subscription: ${mappedRecord.user_id}, setting to null`
              );
              mappedRecord.user_id = null;
            }
          }
        }

        // Handle null values for required fields
        if (tableName === 'users') {
          if (!mappedRecord.name) mappedRecord.name = 'Unknown User';
          if (!mappedRecord.email)
            mappedRecord.email = `user-${record.id}@example.com`;
          // SAFETY: Password is required - skip users without passwords
          // Also reject default_password for security
          if (!mappedRecord.password) {
            console.log(
              `⚠️ Skipping user ${mappedRecord.id} - no password provided`
            );
            skippedRecords++;
            continue;
          }
          // SAFETY: Never allow default_password to be inserted
          if (mappedRecord.password === 'default_password') {
            console.log(
              `⚠️ Skipping user ${mappedRecord.id} - default_password is not allowed`
            );
            skippedRecords++;
            continue;
          }
        }
        if (tableName === 'categories') {
          if (!mappedRecord.name) mappedRecord.name = 'Unnamed Category';
          if (!mappedRecord.slug) mappedRecord.slug = `category-${record.id}`;
        }
        if (tableName === 'books') {
          if (!mappedRecord.title) mappedRecord.title = 'Untitled Book';
          if (!mappedRecord.slug) mappedRecord.slug = `book-${record.id}`;
        }

        // Skip if record is similar to existing one
        if (shouldSkip) {
          continue;
        }

        // SAFETY: For users table, never allow sensitive auth fields from migration data
        // These should only be set through proper auth flows, not migration scripts
        if (tableName === 'users') {
          // For existing users, don't overwrite any sensitive auth fields
          if (recordExists) {
            delete mappedRecord.password;
            delete mappedRecord.hasDefaultPassword;
            delete mappedRecord.emailVerificationToken;
            delete mappedRecord.isEmailVerified;
          } else {
            // For NEW users, strip out fields that should never come from migration
            // Only password is allowed (and already validated above)
            delete mappedRecord.hasDefaultPassword;
            delete mappedRecord.emailVerificationToken;
            // isEmailVerified should default to false for new users from migration
            // They need to verify their email through proper channels
            if (mappedRecord.isEmailVerified !== undefined) {
              delete mappedRecord.isEmailVerified;
            }
          }
        }

        // Insert or update record
        const insertColumns = Object.keys(mappedRecord);
        const insertValues = insertColumns.map(
          col => `$${insertColumns.indexOf(col) + 1}`
        );
        const values = insertColumns.map(col => mappedRecord[col]);

        if (recordExists) {
          // Update existing record
          const updateColumns = insertColumns.filter(col => col !== 'id');
          const quotedUpdateValues = updateColumns
            .map(col => `"${col}" = $${insertColumns.indexOf(col) + 1}`)
            .join(', ');
          const query = `
            UPDATE ${tableName}
            SET ${quotedUpdateValues}
            WHERE "id" = $${insertColumns.indexOf('id') + 1}
          `;
          await dataSource.query(query, values);
          updatedRecords++;
        } else {
          // Insert new record
          const quotedColumns = insertColumns.map(col => `"${col}"`).join(', ');

          const query = `
            INSERT INTO ${tableName} (${quotedColumns})
            VALUES (${insertValues.join(', ')})
          `;

          try {
            await dataSource.query(query, values);
            newRecords++;
          } catch (error) {
            if (
              error.message.includes(
                'duplicate key value violates unique constraint'
              ) ||
              error.message.includes(
                'there is no unique or exclusion constraint matching the ON CONFLICT specification'
              )
            ) {
              console.log(
                `⚠️ Skipping duplicate record with ID: ${mappedRecord.id}`
              );
              skippedRecords++;
            } else {
              throw error;
            }
          }
        }
      }

      console.log(
        `✅ ${tableName}: ${newRecords} new, ${updatedRecords} updated, ${skippedRecords} skipped`
      );
    }

    console.log('\n🎉 Migration from individual JSON files completed!');
    console.log('\n📊 Summary:');
    console.log('   - Records with same ID and similar content were skipped');
    console.log(
      '   - Only truly new or different records were inserted/updated'
    );
    console.log('   - This prevents data duplication while preserving updates');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void migrateFromIndividualJson();
