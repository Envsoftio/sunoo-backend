import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { SleepSoundsService } from '../src/sleep-sounds/sleep-sounds.service';
import { S3Service } from '../src/common/services/s3.service';
import { SleepSound } from '../src/entities/sleep-sound.entity';
import { SleepSoundCategory } from '../src/entities/sleep-sound-category.entity';
import * as https from 'https';

// Full catalog from https://github.com/remvze/moodist/tree/main/public/sounds
// Files live under public/sounds/{categoryKey}/{file} — download URL uses that path.
const GITHUB_BASE_URL =
  'https://raw.githubusercontent.com/remvze/moodist/main/public/sounds';

// Default tags, mood, intensity per category. Used when no per-file override.
const CATEGORY_META: Record<
  string,
  { tags: string[]; mood: string; intensity: string }
> = {
  nature: {
    tags: ['nature', 'relaxing', 'ambient'],
    mood: 'calm',
    intensity: 'low',
  },
  urban: {
    tags: ['urban', 'ambient', 'city'],
    mood: 'focus',
    intensity: 'medium',
  },
  noise: {
    tags: ['noise', 'focus', 'sleep'],
    mood: 'focus',
    intensity: 'medium',
  },
  rain: {
    tags: ['rain', 'relaxing', 'weather'],
    mood: 'calm',
    intensity: 'medium',
  },
  animals: {
    tags: ['animals', 'nature', 'ambient'],
    mood: 'calm',
    intensity: 'low',
  },
  binaural: {
    tags: ['binaural', 'focus', 'meditation'],
    mood: 'focus',
    intensity: 'low',
  },
  places: {
    tags: ['places', 'ambient', 'environment'],
    mood: 'focus',
    intensity: 'low',
  },
  things: {
    tags: ['things', 'ambient', 'mechanical'],
    mood: 'focus',
    intensity: 'low',
  },
  transport: {
    tags: ['transport', 'ambient', 'travel'],
    mood: 'focus',
    intensity: 'medium',
  },
};

// Per-file overrides for tags, mood, intensity (optional). Key: categoryKey -> filename -> meta.
const SOUND_META_OVERRIDES: Record<
  string,
  Record<string, { tags?: string[]; mood?: string; intensity?: string }>
> = {
  nature: {
    'howling-wind.mp3': { intensity: 'high' },
    'waterfall.mp3': { intensity: 'medium' },
    'wind.mp3': { intensity: 'medium' },
  },
  rain: {
    'thunder.mp3': {
      tags: ['rain', 'storm', 'thunder'],
      mood: 'calm',
      intensity: 'high',
    },
    'heavy-rain.mp3': { intensity: 'high' },
  },
  urban: {
    'ambulance-siren.mp3': { intensity: 'high' },
    'fireworks.mp3': { intensity: 'high' },
  },
  noise: {
    'brown-noise.wav': {
      tags: ['noise', 'sleep', 'deep-sleep'],
      intensity: 'medium',
    },
  },
};

const GITHUB_SOUNDS: Record<
  string,
  { name: string; description: string; priority: number; files: string[] }
> = {
  nature: {
    name: 'Nature',
    description: 'Calming natural sounds',
    priority: 1,
    files: [
      'campfire.mp3',
      'droplets.mp3',
      'howling-wind.mp3',
      'jungle.mp3',
      'river.mp3',
      'walk-in-snow.mp3',
      'walk-on-gravel.mp3',
      'walk-on-leaves.mp3',
      'waterfall.mp3',
      'waves.mp3',
      'wind-in-trees.mp3',
      'wind.mp3',
    ],
  },
  urban: {
    name: 'Urban',
    description: 'City and indoor sounds',
    priority: 2,
    files: [
      'ambulance-siren.mp3',
      'busy-street.mp3',
      'crowd.mp3',
      'fireworks.mp3',
      'highway.mp3',
      'road.mp3',
      'traffic.mp3',
    ],
  },
  noise: {
    name: 'Noise',
    description: 'White, pink and brown noise for focus and sleep',
    priority: 3,
    files: ['brown-noise.wav', 'pink-noise.wav', 'white-noise.wav'],
  },
  rain: {
    name: 'Rain',
    description: 'Rain and storm sounds',
    priority: 4,
    files: [
      'heavy-rain.mp3',
      'light-rain.mp3',
      'rain-on-car-roof.mp3',
      'rain-on-leaves.mp3',
      'rain-on-tent.mp3',
      'rain-on-umbrella.mp3',
      'rain-on-window.mp3',
      'thunder.mp3',
    ],
  },
  animals: {
    name: 'Animals',
    description: 'Animal and bird sounds',
    priority: 5,
    files: [
      'beehive.mp3',
      'birds.mp3',
      'cat-purring.mp3',
      'chickens.mp3',
      'cows.mp3',
      'crickets.mp3',
      'crows.mp3',
      'dog-barking.mp3',
      'frog.mp3',
      'horse-gallop.mp3',
      'owl.mp3',
      'seagulls.mp3',
      'sheep.mp3',
      'whale.mp3',
      'wolf.mp3',
      'woodpecker.mp3',
    ],
  },
  binaural: {
    name: 'Binaural',
    description: 'Binaural beats',
    priority: 6,
    files: [
      'binaural-alpha.wav',
      'binaural-beta.wav',
      'binaural-delta.wav',
      'binaural-gamma.wav',
      'binaural-theta.wav',
    ],
  },
  places: {
    name: 'Places',
    description: 'Ambient sounds from different places',
    priority: 7,
    files: [
      'airport.mp3',
      'cafe.mp3',
      'carousel.mp3',
      'church.mp3',
      'construction-site.mp3',
      'crowded-bar.mp3',
      'laboratory.mp3',
      'laundry-room.mp3',
      'library.mp3',
      'night-village.mp3',
      'office.mp3',
      'restaurant.mp3',
      'subway-station.mp3',
      'supermarket.mp3',
      'temple.mp3',
      'underwater.mp3',
    ],
  },
  things: {
    name: 'Things',
    description: 'Everyday object sounds',
    priority: 8,
    files: [
      'boiling-water.mp3',
      'bubbles.mp3',
      'ceiling-fan.mp3',
      'clock.mp3',
      'dryer.mp3',
      'keyboard.mp3',
      'morse-code.mp3',
      'paper.mp3',
      'singing-bowl.mp3',
      'slide-projector.mp3',
      'tuning-radio.mp3',
      'typewriter.mp3',
      'vinyl-effect.mp3',
      'washing-machine.mp3',
      'wind-chimes.mp3',
      'windshield-wipers.mp3',
    ],
  },
  transport: {
    name: 'Transport',
    description: 'Transport and vehicle sounds',
    priority: 9,
    files: [
      'airplane.mp3',
      'inside-a-train.mp3',
      'rowing-boat.mp3',
      'sailboat.mp3',
      'submarine.mp3',
      'train.mp3',
    ],
  },
};

function fileToDisplayName(filename: string): string {
  const base = filename.replace(/\.(mp3|wav)$/i, '');
  return base
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function mimeFromFilename(filename: string): string {
  return filename.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
}

function getSoundMeta(
  categoryKey: string,
  filename: string
): { tags: string[]; mood: string; intensity: string } {
  const def = CATEGORY_META[categoryKey] ?? {
    tags: ['ambient'],
    mood: 'calm',
    intensity: 'low',
  };
  const over = SOUND_META_OVERRIDES[categoryKey]?.[filename];
  return {
    tags: over?.tags ?? def.tags,
    mood: over?.mood ?? def.mood,
    intensity: over?.intensity ?? def.intensity,
  };
}

async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          https.get(response.headers.location!, redirectResponse => {
            const chunks: Buffer[] = [];
            redirectResponse.on('data', chunk => chunks.push(chunk));
            redirectResponse.on('end', () => resolve(Buffer.concat(chunks)));
            redirectResponse.on('error', reject);
          });
        } else if (response.statusCode === 200) {
          const chunks: Buffer[] = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        } else {
          reject(new Error(`Failed to download: ${response.statusCode}`));
        }
      })
      .on('error', reject);
  });
}

async function bootstrap() {
  console.log('🎵 Starting sleep sounds import from GitHub...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const sleepSoundsService = app.get(SleepSoundsService);
  const s3Service = app.get(S3Service);
  const categoryRepo = app.get<Repository<SleepSoundCategory>>(
    getRepositoryToken(SleepSoundCategory)
  );
  const soundRepo = app.get<Repository<SleepSound>>(
    getRepositoryToken(SleepSound)
  );

  const s3Config = configService.get<{ bucket: string; region: string }>('s3');
  const bucket = s3Config?.bucket || process.env.AWS_S3_BUCKET || '(not set)';
  const region = s3Config?.region || process.env.AWS_REGION || 'ap-south-1';
  const exampleKey = 'sleep-sounds/<category-id>-rain.mp3';
  const exampleFullUrl = s3Service.getFileUrl(exampleKey);

  console.log('📦 S3 upload target:');
  console.log(`   Bucket: ${bucket}`);
  console.log(`   Region: ${region}`);
  console.log(`   Key pattern: sleep-sounds/<category-uuid>-<filename>.mp3`);
  console.log(`   Example key: ${exampleKey}`);
  console.log(`   Example full URL: ${exampleFullUrl}`);
  console.log(
    '   (Re-run: existing categories/sounds by name are updated, not duplicated.)'
  );
  console.log('');

  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let soundsCreated = 0;
  let soundsUpdated = 0;
  let failedUploads = 0;

  try {
    for (const [categoryKey, categoryData] of Object.entries(GITHUB_SOUNDS)) {
      console.log(`\n📁 Processing category: ${categoryData.name}`);

      let category = await categoryRepo.findOne({
        where: { name: categoryData.name },
      });
      if (!category) {
        category = await sleepSoundsService.createCategory({
          name: categoryData.name,
          description: categoryData.description,
          priority: categoryData.priority,
          is_published: true,
        });
        console.log(`   ✓ Category created: ${category.id}`);
        categoriesCreated++;
      } else {
        console.log(`   ✓ Category exists: ${category.id}`);
        categoriesUpdated++;
      }

      for (const file of categoryData.files) {
        const displayName = fileToDisplayName(file);
        const fileMeta = getSoundMeta(categoryKey, file);

        const existing = await soundRepo.findOne({
          where: { category_id: category.id, name: displayName },
        });

        if (existing) {
          await sleepSoundsService.updateSound(existing.id, {
            tags: fileMeta.tags,
            mood: fileMeta.mood,
            intensity: fileMeta.intensity,
          });
          console.log(
            `   🎵 Updated metadata: ${displayName} (tags, mood, intensity)`
          );
          soundsUpdated++;
          continue;
        }

        console.log(`\n   🎵 Importing sound: ${displayName} (${file})`);
        try {
          const fileUrl = `${GITHUB_BASE_URL}/${categoryKey}/${file}`;
          console.log(`      Downloading from: ${fileUrl}`);

          const fileBuffer = await downloadFile(fileUrl);
          console.log(`      ✓ Downloaded ${fileBuffer.length} bytes`);

          const folder = 'sleep-sounds';
          const filename = `${category.id}-${file}`;
          const mimeType = mimeFromFilename(file);

          const fileKey = await s3Service.uploadFile(
            fileBuffer,
            folder,
            filename,
            mimeType
          );

          console.log(`      ✓ Uploaded to S3: ${fileKey}`);

          const estimatedDuration = Math.floor(Math.random() * 120) + 60;

          await sleepSoundsService.createSound({
            name: displayName,
            description: '',
            audio_url: fileKey,
            duration_seconds: estimatedDuration,
            file_size_bytes: fileBuffer.length,
            mime_type: mimeType,
            category_id: category.id,
            priority: 0,
            is_published: true,
            is_premium: false,
            tags: fileMeta.tags,
            mood: fileMeta.mood,
            intensity: fileMeta.intensity,
          });

          console.log(`      ✓ Sound created in database`);
          soundsCreated++;
        } catch (error) {
          console.error(`      ✗ Failed to import ${file}:`, error.message);
          failedUploads++;
        }
      }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log('='.repeat(60));
    console.log(
      `✓ Categories created: ${categoriesCreated} (existing: ${categoriesUpdated})`
    );
    console.log(
      `✓ Sounds created: ${soundsCreated} (metadata updated: ${soundsUpdated})`
    );
    console.log(`✗ Failed uploads: ${failedUploads}`);
    console.log('='.repeat(60));

    if (soundsCreated > 0 || soundsUpdated > 0) {
      console.log('\n✨ Import completed successfully!');
      console.log(
        '   Re-run anytime to update tags/mood/intensity on existing sounds.'
      );
    }
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
