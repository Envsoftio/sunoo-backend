#!/bin/bash

# Data Migration Script for Sunoo Database
# This script migrates data from JSON backups to the PostgreSQL database

set -e

echo "🚀 Starting data migration from JSON backups..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h localhost -p 5432 -U postgres -d sunooapp; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Check if backups directory exists
if [ ! -d "/docker-entrypoint-initdb.d/backups" ]; then
  echo "❌ Backups directory not found. Please ensure backups are mounted."
  exit 1
fi

# Install Node.js and npm for running the migration script
echo "📦 Installing Node.js and dependencies..."
apk add --no-cache nodejs npm

# Copy the migration script to a temporary location
echo "📋 Setting up migration script..."
cat > /tmp/migrate-data.js << 'EOF'
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'sunooapp'
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

// Special column mappings
const SPECIAL_COLUMN_MAPPINGS = {
  books: {
    category: 'categoryId',
  },
  users: {
    imageURL: 'avatar',
  },
  book_ratings: {
    comment: 'comment',
    rating: 'rating',
  },
};

async function getTableColumns(tableName) {
  try {
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    return result.rows.map(row => row.column_name);
  } catch (error) {
    console.error(`❌ Error getting columns for ${tableName}:`, error.message);
    return [];
  }
}

async function createColumnMapping(jsonFileName, tableName) {
  const jsonPath = path.join('/docker-entrypoint-initdb.d/backups', jsonFileName);

  if (!fs.existsSync(jsonPath)) {
    console.log(`⚠️ File not found: ${jsonPath}`);
    return {};
  }

  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
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

  const mapping = {};
  const specialMappings = SPECIAL_COLUMN_MAPPINGS[tableName] || {};

  for (const jsonCol of jsonColumns) {
    if (specialMappings[jsonCol]) {
      mapping[jsonCol] = specialMappings[jsonCol];
      continue;
    }

    let dbCol = dbColumns.find(dbCol => dbCol === jsonCol);

    if (!dbCol) {
      dbCol = dbColumns.find(
        dbCol => dbCol.toLowerCase() === jsonCol.toLowerCase()
      );
    }

    if (!dbCol) {
      const snakeCase = jsonCol.replace(/([A-Z])/g, '_$1').toLowerCase();
      dbCol = dbColumns.find(dbCol => dbCol === snakeCase);
    }

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

async function migrateFromIndividualJson() {
  try {
    await client.connect();
    console.log('🚀 Starting migration from individual JSON files...\n');

    const backupsDir = '/docker-entrypoint-initdb.d/backups';
    const jsonFiles = fs.readdirSync(backupsDir).filter(file =>
      file.endsWith('.json')
    );

    console.log(`📁 Found ${jsonFiles.length} JSON files in backups folder`);

    const MIGRATION_ORDER = [
      'User.json',
      'Category.json',
      'Authors.json',
      'CastMembers.json',
      'Plans.json',
      'Books.json',
      'Chapters.json',
      'Narrator.json',
      'Bookmarks.json',
      'BookRatings.json',
      'UserProgress.json',
      'Subscriptions.json',
      'Payments.json',
      'AudiobookListeners.json',
      'ChapterBookmarks.json',
      'feedback.json',
      'StoryCasts.json',
    ];

    for (const jsonFile of MIGRATION_ORDER) {
      if (!jsonFiles.includes(jsonFile)) {
        console.log(`⚠️ Skipping ${jsonFile} - file not found`);
        continue;
      }

      const tableName = TABLE_MAPPING[jsonFile];

      if (!tableName) {
        console.log(`⚠️ No mapping found for file: ${jsonFile}`);
        continue;
      }

      console.log(`\n🔄 Processing ${jsonFile} -> ${tableName}...`);

      const jsonPath = path.join(backupsDir, jsonFile);
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      const records = JSON.parse(jsonContent);

      if (!Array.isArray(records) || records.length === 0) {
        console.log(`⏭️ Skipping ${jsonFile} - no data`);
        continue;
      }

      const columnMapping = await createColumnMapping(jsonFile, tableName);

      const existingRecords = await client.query(`SELECT * FROM ${tableName}`);
      const existingIds = new Set(existingRecords.rows.map(r => r.id));

      let newRecords = 0;
      let updatedRecords = 0;
      let skippedRecords = 0;

      for (const record of records) {
        const mappedRecord = {};

        for (const [jsonColumn, dbColumn] of Object.entries(columnMapping)) {
          if (record[jsonColumn] !== undefined) {
            let value = record[jsonColumn];
            if (value === '\\N' || value === null || value === '') {
              value = null;
            }
            mappedRecord[dbColumn] = value;
          }
        }

        if (!mappedRecord.id || mappedRecord.id === '\\N' || mappedRecord.id === null) {
          skippedRecords++;
          continue;
        }

        const recordExists = existingIds.has(mappedRecord.id);

        if (!mappedRecord.created_at) {
          mappedRecord.created_at = new Date().toISOString();
        }
        if (!mappedRecord.updated_at) {
          mappedRecord.updated_at = new Date().toISOString();
        }

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

        const insertColumns = Object.keys(mappedRecord);
        const insertValues = insertColumns.map((_, index) => `$${index + 1}`);
        const values = insertColumns.map(col => mappedRecord[col]);

        if (recordExists) {
          const updateColumns = insertColumns.filter(col => col !== 'id');
          const quotedUpdateValues = updateColumns
            .map(col => `"${col}" = $${insertColumns.indexOf(col) + 1}`)
            .join(', ');
          const query = `
            UPDATE ${tableName}
            SET ${quotedUpdateValues}
            WHERE "id" = $${insertColumns.indexOf('id') + 1}
          `;
          await client.query(query, values);
          updatedRecords++;
        } else {
          const quotedColumns = insertColumns.map(col => `"${col}"`).join(', ');
          const query = `
            INSERT INTO ${tableName} (${quotedColumns})
            VALUES (${insertValues.join(', ')})
          `;

          try {
            await client.query(query, values);
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

      console.log(
        `✅ ${tableName}: ${newRecords} new, ${updatedRecords} updated, ${skippedRecords} skipped`
      );
    }

    console.log('\n🎉 Migration from individual JSON files completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateFromIndividualJson();
EOF

# Install pg package for Node.js
echo "📦 Installing PostgreSQL client for Node.js..."
npm install pg

# Run the migration
echo "🔄 Running data migration..."
node /tmp/migrate-data.js

echo "✅ Data migration completed successfully!"
