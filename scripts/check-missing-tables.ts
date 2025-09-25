import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { readdirSync } from 'fs';

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

// Tables from backup file
const BACKUP_TABLES = [
  'AudiobookListeners',
  'Authors',
  'BookRatings',
  'Bookmarks',
  'Books',
  'CastMembers',
  'Category',
  'ChapterBookmarks',
  'Chapters',
  'Narrator',
  'Payments',
  'Plans',
  'StoryCasts',
  'Subscriptions',
  'User',
  'UserProgress',
  'feedback',
];

// Mapping from backup table names to current database names
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

async function checkMissingTables() {
  try {
    await dataSource.initialize();
    console.log('🔍 Checking for missing tables...\n');

    // Get current database tables
    const currentTables = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    const currentTableNames = currentTables.map((t) => t.table_name);

    console.log('📊 Current database tables:');
    currentTableNames.forEach((table) => {
      console.log(`  ✅ ${table}`);
    });

    console.log('\n🔍 Checking for missing tables...\n');

    const missingTables: { backup: string; current: string }[] = [];
    const existingTables: { backup: string; current: string }[] = [];

    for (const backupTable of BACKUP_TABLES) {
      const mappedName =
        TABLE_MAPPING[backupTable as keyof typeof TABLE_MAPPING];

      if (!mappedName) {
        console.log(`⚠️ No mapping defined for: ${backupTable}`);
        continue;
      }

      if (currentTableNames.includes(mappedName)) {
        existingTables.push({ backup: backupTable, current: mappedName });
        console.log(`✅ ${backupTable} -> ${mappedName}`);
      } else {
        missingTables.push({ backup: backupTable, current: mappedName });
        console.log(`❌ ${backupTable} -> ${mappedName} (MISSING)`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`  ✅ Existing tables: ${existingTables.length}`);
    console.log(`  ❌ Missing tables: ${missingTables.length}`);

    if (missingTables.length > 0) {
      console.log('\n🚨 Missing tables that need to be created:');
      missingTables.forEach((table) => {
        console.log(`  - ${table.backup} -> ${table.current}`);
      });
    }

    // Check for tables in current DB that are not in backup
    const extraTables = currentTableNames.filter(
      (table) => !Object.values(TABLE_MAPPING).includes(table),
    );

    if (extraTables.length > 0) {
      console.log('\n➕ Extra tables in current DB (not in backup):');
      extraTables.forEach((table) => {
        console.log(`  - ${table}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await dataSource.destroy();
  }
}

checkMissingTables();
