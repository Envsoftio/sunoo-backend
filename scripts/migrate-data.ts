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
  'Authors.json': 'authors',
  'Chapters.json': 'chapters',
  'Narrator.json': 'narrators',
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
  'books': {
    'category': 'categoryId', // DDL shows category -> categoryId
  },
  'users': {
    'imageURL': 'avatar', // DDL shows imageURL but our DB has avatar
  },
  'book_ratings': {
    'comment': 'comment', // Use comment column for comment field
    'rating': 'rating',   // Use rating column for rating field
  }
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

async function createColumnMapping(jsonFileName: string, tableName: string): Promise<Record<string, string>> {
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
      dbCol = dbColumns.find(dbCol => dbCol.toLowerCase() === jsonCol.toLowerCase());
    }

    // Try camelCase to snake_case conversion
    if (!dbCol) {
      const snakeCase = jsonCol.replace(/([A-Z])/g, '_$1').toLowerCase();
      dbCol = dbColumns.find(dbCol => dbCol === snakeCase);
    }

    // Try snake_case to camelCase conversion
    if (!dbCol) {
      const camelCase = jsonCol.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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

async function migrateFromIndividualJson() {
  try {
    await dataSource.initialize();
    console.log('🚀 Starting migration from individual JSON files...\n');

    // Get all JSON files in backups folder
    const backupsDir = 'backups';
    const jsonFiles = readdirSync(backupsDir).filter(file => file.endsWith('.json'));

    console.log(`📁 Found ${jsonFiles.length} JSON files in backups folder`);

    // Process each JSON file
    for (const jsonFile of jsonFiles) {
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
      const existingRecords = await dataSource.query(`SELECT id FROM ${tableName}`);
      const existingIds = new Set(existingRecords.map(r => r.id));

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
        if (!mappedRecord.id || mappedRecord.id === '\\N' || mappedRecord.id === null) {
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
        if (tableName !== 'payments') {
          const uuidFields = ['id', 'userId', 'bookId', 'chapterId', 'categoryId'];
          for (const field of uuidFields) {
            if (mappedRecord[field] && typeof mappedRecord[field] === 'string') {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              if (!uuidRegex.test(mappedRecord[field])) {
                console.log(`⚠️ Skipping record with invalid UUID in field ${field}: ${mappedRecord[field]}`);
                skippedRecords++;
                continue;
              }
            }
          }
        }

        // Handle special cases for specific tables
        if (tableName === 'payments') {
          // Validate plan_id and user_id are valid UUIDs
          if (mappedRecord.plan_id && typeof mappedRecord.plan_id === 'string') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(mappedRecord.plan_id)) {
              console.log(`⚠️ Invalid plan_id format in payment: ${mappedRecord.plan_id}, setting to null`);
              mappedRecord.plan_id = null;
            }
          }
          if (mappedRecord.user_id && typeof mappedRecord.user_id === 'string') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(mappedRecord.user_id)) {
              console.log(`⚠️ Invalid user_id format in payment: ${mappedRecord.user_id}, setting to null`);
              mappedRecord.user_id = null;
            }
          }
        }

        if (tableName === 'subscriptions') {
          // Validate plan_id and user_id are valid UUIDs
          if (mappedRecord.plan_id && typeof mappedRecord.plan_id === 'string') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(mappedRecord.plan_id)) {
              console.log(`⚠️ Invalid plan_id format in subscription: ${mappedRecord.plan_id}, setting to null`);
              mappedRecord.plan_id = null;
            }
          }
          if (mappedRecord.user_id && typeof mappedRecord.user_id === 'string') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(mappedRecord.user_id)) {
              console.log(`⚠️ Invalid user_id format in subscription: ${mappedRecord.user_id}, setting to null`);
              mappedRecord.user_id = null;
            }
          }
        }

        // Handle null values for required fields
        if (tableName === 'users') {
          if (!mappedRecord.name) mappedRecord.name = 'Unknown User';
          if (!mappedRecord.email) mappedRecord.email = `user-${record.id}@example.com`;
          if (!mappedRecord.password) mappedRecord.password = 'default_password';
        }
        if (tableName === 'categories') {
          if (!mappedRecord.name) mappedRecord.name = 'Unnamed Category';
          if (!mappedRecord.slug) mappedRecord.slug = `category-${record.id}`;
        }
        if (tableName === 'books') {
          if (!mappedRecord.title) mappedRecord.title = 'Untitled Book';
          if (!mappedRecord.slug) mappedRecord.slug = `book-${record.id}`;
        }

        // Insert or update record
        const insertColumns = Object.keys(mappedRecord);
        const insertValues = insertColumns.map(col => `$${insertColumns.indexOf(col) + 1}`);
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
          // Insert new record with conflict handling
          const quotedColumns = insertColumns.map(col => `"${col}"`).join(', ');
          const updateColumns = insertColumns.filter(col => col !== 'id');
          const quotedUpdateValues = updateColumns
            .map(col => `"${col}" = EXCLUDED."${col}"`)
            .join(', ');

          const query = `
            INSERT INTO ${tableName} (${quotedColumns})
            VALUES (${insertValues.join(', ')})
            ON CONFLICT (id) DO UPDATE SET ${quotedUpdateValues}
          `;

          try {
            await dataSource.query(query, values);
            newRecords++;
          } catch (error) {
            if (error.message.includes('duplicate key value violates unique constraint')) {
              console.log(`⚠️ Skipping duplicate record with ID: ${mappedRecord.id}`);
              skippedRecords++;
            } else {
              throw error;
            }
          }
        }
      }

      console.log(`✅ ${tableName}: ${newRecords} new, ${updatedRecords} updated, ${skippedRecords} skipped`);
    }

    console.log('\n🎉 Migration from individual JSON files completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

migrateFromIndividualJson();
