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

// Missing tables that need to be created (excluding std_ tables)
const MISSING_TABLES = ['CastMembers', 'StoryCasts'];

// Table name mapping
const TABLE_MAPPING = {
  CastMembers: 'cast_members',
  StoryCasts: 'story_casts',
};

function extractTableDefinition(
  backupContent: string,
  tableName: string,
): string | null {
  try {
    // Try with quotes first
    let tableDefPattern = new RegExp(
      `CREATE TABLE public\\.\\"${tableName}\\"[\\s\\S]*?;`,
      'g',
    );
    let match = tableDefPattern.exec(backupContent);

    if (!match) {
      // Try without quotes for std_ tables
      tableDefPattern = new RegExp(
        `CREATE TABLE public\\.${tableName}[\\s\\S]*?;`,
        'g',
      );
      match = tableDefPattern.exec(backupContent);
    }

    if (!match) return null;

    return match[0];
  } catch (error) {
    console.error(
      `❌ Error extracting table definition for ${tableName}:`,
      error.message,
    );
    return null;
  }
}

function convertTableDefinition(
  tableDef: string,
  newTableName: string,
): string {
  // Replace the table name (handle both quoted and unquoted)
  let convertedDef = tableDef.replace(
    /CREATE TABLE public\.("?)([^"]+)\1/,
    `CREATE TABLE IF NOT EXISTS ${newTableName}`,
  );

  // Remove quotes from column names and convert to snake_case
  convertedDef = convertedDef.replace(/"([^"]+)"/g, (match, columnName) => {
    // Convert camelCase to snake_case
    const snakeCase = columnName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
    return snakeCase;
  });

  // Remove quotes from constraint names
  convertedDef = convertedDef.replace(/CONSTRAINT "([^"]+)"/g, 'CONSTRAINT $1');

  // Remove quotes from foreign key references
  convertedDef = convertedDef.replace(/REFERENCES "([^"]+)"/g, 'REFERENCES $1');

  return convertedDef;
}

async function createMissingTables() {
  try {
    await dataSource.initialize();
    console.log('🚀 Creating missing tables...\n');

    // Find and read backup file dynamically
    const backupFileName = findBackupFile();
    const backupContent = readFileSync(backupFileName, 'utf8');

    let createdCount = 0;
    let errorCount = 0;

    for (const backupTableName of MISSING_TABLES) {
      const currentTableName =
        TABLE_MAPPING[backupTableName as keyof typeof TABLE_MAPPING];

      if (!currentTableName) {
        console.log(`⚠️ No mapping found for table: ${backupTableName}`);
        continue;
      }

      console.log(
        `\n🔄 Creating table: ${backupTableName} -> ${currentTableName}`,
      );

      try {
        // Extract table definition from backup
        const tableDef = extractTableDefinition(backupContent, backupTableName);

        if (!tableDef) {
          console.log(
            `❌ Could not find table definition for ${backupTableName}`,
          );
          errorCount++;
          continue;
        }

        // Convert table definition
        const convertedDef = convertTableDefinition(tableDef, currentTableName);

        console.log(`📝 Table definition:`);
        console.log(convertedDef);

        // Create the table
        await dataSource.query(convertedDef);

        console.log(`✅ Successfully created table: ${currentTableName}`);
        createdCount++;
      } catch (error) {
        console.error(
          `❌ Error creating table ${currentTableName}:`,
          error.message,
        );
        errorCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Tables created: ${createdCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);

    // Verify tables were created
    console.log('\n🔍 Verifying created tables...');
    const currentTables = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const currentTableNames = currentTables.map((t) => t.table_name);

    for (const backupTableName of MISSING_TABLES) {
      const currentTableName =
        TABLE_MAPPING[backupTableName as keyof typeof TABLE_MAPPING];
      if (currentTableName && currentTableNames.includes(currentTableName)) {
        console.log(`  ✅ ${backupTableName} -> ${currentTableName}`);
      } else {
        console.log(
          `  ❌ ${backupTableName} -> ${currentTableName} (NOT CREATED)`,
        );
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await dataSource.destroy();
  }
}

createMissingTables();
