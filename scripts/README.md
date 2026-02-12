# Sleep Sounds Import Script

This script imports sleep sounds from the Moodist GitHub repository into your Sunoo backend.

## Prerequisites

1. Ensure your database is set up and migrations are run:
   ```bash
   npm run migration:run
   ```

2. Configure your `.env` file with S3 credentials:
   ```
   AWS_S3_ACCESS_KEY=your_access_key
   AWS_S3_SECRET_KEY=your_secret_key
   AWS_S3_BUCKET=your_bucket_name
   AWS_S3_REGION=your_region
   ```

## Running the Import

### Option 1: Using ts-node (Recommended)

```bash
npx ts-node -r tsconfig-paths/register scripts/import-sleep-sounds.ts
```

### Option 2: Compile and Run

```bash
# Compile TypeScript
npm run build

# Run the compiled script
node dist/scripts/import-sleep-sounds.js
```

### Option 3: Add to package.json

Add this to your `package.json` scripts section:

```json
{
  "scripts": {
    "import:sounds": "ts-node -r tsconfig-paths/register scripts/import-sleep-sounds.ts"
  }
}
```

Then run:

```bash
npm run import:sounds
```

## What It Does

The script will:

1. **Download sounds** from the Moodist GitHub repository
2. **Upload to S3** in your configured bucket
3. **Create categories** in the database:
   - Nature (rain, thunder, wind, ocean, forest)
   - Urban (city traffic, coffee shop, fireplace)
   - White Noise (white, pink, brown noise)
   - Ambient (fan, air conditioner)
4. **Create sound records** in the database with:
   - Name and description
   - S3 audio URL
   - File size and MIME type
   - Tags, mood, and intensity
   - Premium/free status

## Output

The script provides detailed logging:

```
🎵 Starting sleep sounds import from GitHub...

📁 Processing category: Nature
   ✓ Category created: abc-123-def

   🎵 Importing sound: Rain
      Downloading from: https://raw.githubusercontent.com/...
      ✓ Downloaded 1234567 bytes
      ✓ Uploaded to S3: sleep-sounds/abc-123-def-rain.mp3
      ✓ Sound created in database: xyz-789-ghi

============================================================
📊 Import Summary:
============================================================
✓ Categories created: 4
✓ Sounds attempted: 11
✓ Successful uploads: 11
✗ Failed uploads: 0
============================================================

✨ Import completed successfully!
```

## Customization

To add more sounds or modify categories, edit the `GITHUB_SOUNDS` object in `import-sleep-sounds.ts`:

```typescript
const GITHUB_SOUNDS = {
  your_category: {
    name: 'Your Category',
    description: 'Description',
    icon: null,
    priority: 5,
    sounds: [
      {
        name: 'Your Sound',
        description: 'Sound description',
        file: 'your-sound.mp3',
        tags: ['tag1', 'tag2'],
        mood: 'calm',
        intensity: 'medium',
        is_premium: false,
      },
    ],
  },
};
```

## Troubleshooting

### Error: Cannot find module

Install required dependencies:

```bash
npm install --save-dev ts-node tsconfig-paths
```

### Error: S3 upload failed

Check your S3 credentials and bucket permissions in `.env`.

### Error: Database connection failed

Ensure your database is running and connection details in `.env` are correct.

### Sound files not found on GitHub

The script uses the public Moodist repository. If files are moved or renamed, you'll need to update the `file` paths in the `GITHUB_SOUNDS` object.

## Post-Import Steps

1. **Verify in Admin Panel**: Go to `/admin/sleep-sounds` to see imported sounds
2. **Update Durations**: The script uses estimated durations - update with actual values if needed
3. **Test in App**: Open the Flutter app and navigate to Sleep > Sounds
4. **Adjust Settings**: Configure free user limits in `/admin/settings`

## Note on Audio Duration

The script currently uses estimated durations (60-180 seconds). To get accurate durations, you can:

1. Install ffprobe (part of ffmpeg)
2. Use the `fluent-ffmpeg` package to extract actual duration
3. Update the script to calculate real durations

Example:

```typescript
import * as ffmpeg from 'fluent-ffmpeg';

function getAudioDuration(buffer: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(buffer, (err, metadata) => {
      if (err) reject(err);
      else resolve(Math.floor(metadata.format.duration || 0));
    });
  });
}
```
