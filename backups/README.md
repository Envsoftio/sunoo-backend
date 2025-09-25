# Sunoo Backend Database Backup

This directory contains database backup files and migration scripts for the Sunoo backend application.

## Backup Files

### Current Backups

- `supabase-backup-converted.json` - Converted Supabase backup data (JSON format)

### Original Supabase Backup

- `db_cluster-23-09-2025@21-08-24.backup` - Original Supabase PostgreSQL backup file

## Migration Scripts

### Available Scripts

1. `simple-backup-converter.ts` - Convert .backup file to JSON format
2. `comprehensive-backup-migration.ts` - Complete migration from backup file with duplicate checking

### Usage

#### Convert Backup File to JSON

```bash
# Convert Supabase backup file to JSON
npm run convert:backup
```

#### Migrate Data from Backup

```bash
# Migrate all data from backup file (checks for existing records)
npm run migrate:backup
```

## Data Migration Process

1. **Convert Backup**: Use `convert:backup` to convert the Supabase .backup file to JSON
2. **Migrate Data**: Use `migrate:backup` to migrate data from the backup file
3. **Verify**: Check the database to ensure all data was migrated correctly

## Features

- **Duplicate Prevention**: The migration script checks for existing records and only adds missing data
- **Column Mapping**: Automatically maps Supabase column names to current database schema
- **Data Validation**: Handles null values and data type conversions
- **Progress Tracking**: Shows detailed progress for each table migration

## Notes

- The migration script is idempotent - it can be run multiple times safely
- Existing records are updated, new records are added
- All backup files are timestamped for easy identification
- JSON backups are human-readable and can be easily modified
