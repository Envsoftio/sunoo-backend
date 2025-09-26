# Data Migration

This directory contains individual JSON files for each table from the Supabase backup.

## Migration Process

To migrate data from these JSON files to the database, run:

```bash
npm run migrate:data
```

## Files

- `*.json` - Individual table data files
- `ddl.sql` - Database schema definition from Supabase
- `README.md` - This file

## Table Files

- `User.json` - User data
- `Books.json` - Book data
- `Chapters.json` - Chapter data
- `Category.json` - Category data
- `Authors.json` - Author data
- `Bookmarks.json` - Bookmark data
- `BookRatings.json` - Book rating data
- `UserProgress.json` - User progress data
- `Subscriptions.json` - Subscription data
- `Payments.json` - Payment data
- `Plans.json` - Plan data
- `AudiobookListeners.json` - Audiobook listener data
- `ChapterBookmarks.json` - Chapter bookmark data
- `CastMembers.json` - Cast member data
- `StoryCasts.json` - Story cast data
- `feedback.json` - Feedback data
- `Narrator.json` - Narrator data

## Notes

- Empty JSON files (2 bytes) indicate no data for that table
- The migration script automatically handles column mapping and data validation
- UUID validation is performed for foreign key fields
- Invalid data is skipped with appropriate warnings
