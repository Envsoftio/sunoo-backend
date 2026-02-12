/**
 * Seed predefined sound mixes. Run after import-sleep-sounds.ts so sounds exist in DB.
 * Resolves sound names (as created by import script) to IDs, then creates each mix.
 *
 * Table: predefined_sound_mixes (entity PredefinedSoundMix).
 * Each row has mix_data: { sounds: [{ sound_id, volume }] }. Volume is 0–1.
 *
 * API GET /api/sleep-sounds/mixes/predefined returns each mix with sounds[] containing
 * sound_id, sound_name, volume, audio_url. Flutter uses mix.sounds and loadMix(sounds)
 * passes each mixSound.volume to playSound(sound, volume: mixSound.volume).
 *
 * Usage: npx ts-node -r tsconfig-paths/register scripts/seed-predefined-mixes.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SleepSoundsService } from '../src/sleep-sounds/sleep-sounds.service';
import { Repository } from 'typeorm';
import { SleepSound } from '../src/entities/sleep-sound.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

interface MixSoundDef {
  name: string; // exact sound name as in DB (e.g. "Heavy Rain", "White Noise")
  volume: number; // 0–1
}

interface PredefinedMixDef {
  name: string;
  description: string;
  category: string; // "Sleep" | "Focus" | "Meditation"
  is_premium: boolean;
  priority: number;
  sounds: MixSoundDef[];
}

// Predefined mixes we decided in plan. Edit names to match DB (from import-sleep-sounds display names).
const PREDEFINED_MIXES: PredefinedMixDef[] = [
  {
    name: 'Deep Sleep',
    description: 'Rain and thunder with brown noise for deep relaxation.',
    category: 'Sleep',
    is_premium: false,
    priority: 1,
    sounds: [
      { name: 'Heavy Rain', volume: 0.7 },
      { name: 'Thunder', volume: 0.4 },
      { name: 'Brown Noise', volume: 0.3 },
    ],
  },
  {
    name: 'Rainy Night',
    description: 'Rain on window with distant thunder.',
    category: 'Sleep',
    is_premium: false,
    priority: 2,
    sounds: [
      { name: 'Rain On Window', volume: 0.8 },
      { name: 'Thunder', volume: 0.35 },
      { name: 'Light Rain', volume: 0.5 },
    ],
  },
  {
    name: 'Ocean Sleep',
    description: 'Waves and wind for a coastal feel.',
    category: 'Sleep',
    is_premium: false,
    priority: 3,
    sounds: [
      { name: 'Waves', volume: 0.75 },
      { name: 'Wind', volume: 0.4 },
    ],
  },
  {
    name: 'Focus & Work',
    description: 'White noise and subtle keyboard for concentration.',
    category: 'Focus',
    is_premium: false,
    priority: 4,
    sounds: [
      { name: 'White Noise', volume: 0.5 },
      { name: 'Keyboard', volume: 0.35 },
    ],
  },
  {
    name: 'Cafe Ambience',
    description: 'Coffee shop background for focus or relaxation.',
    category: 'Focus',
    is_premium: false,
    priority: 5,
    sounds: [{ name: 'Cafe', volume: 0.7 }],
  },
  {
    name: 'Calm Forest',
    description: 'Jungle and birds for a peaceful nature mix.',
    category: 'Meditation',
    is_premium: false,
    priority: 6,
    sounds: [
      { name: 'Jungle', volume: 0.6 },
      { name: 'Birds', volume: 0.5 },
      { name: 'Wind In Trees', volume: 0.35 },
    ],
  },
  {
    name: 'Campfire & Wind',
    description: 'Campfire with gentle wind.',
    category: 'Sleep',
    is_premium: false,
    priority: 7,
    sounds: [
      { name: 'Campfire', volume: 0.7 },
      { name: 'Wind', volume: 0.35 },
    ],
  },
  {
    name: 'Rain on Tent',
    description: 'Cozy rain on tent with light thunder.',
    category: 'Sleep',
    is_premium: true,
    priority: 8,
    sounds: [
      { name: 'Rain On Tent', volume: 0.8 },
      { name: 'Thunder', volume: 0.3 },
    ],
  },
];

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

async function bootstrap() {
  console.log('🎚️ Seeding predefined mixes...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const sleepSoundsService = app.get(SleepSoundsService);
  const soundRepository = app.get<Repository<SleepSound>>(getRepositoryToken(SleepSound));

  const allSounds = await soundRepository.find({ select: ['id', 'name'] });
  const nameToId = new Map<string, string>();
  for (const s of allSounds) {
    nameToId.set(normalizeName(s.name), s.id);
  }
  console.log(`   Loaded ${allSounds.length} sounds from DB.\n`);

  let created = 0;
  let skipped = 0;

  for (const mixDef of PREDEFINED_MIXES) {
    const sounds: { sound_id: string; volume: number }[] = [];
    const missing: string[] = [];

    for (const { name, volume } of mixDef.sounds) {
      const id = nameToId.get(normalizeName(name));
      if (id) {
        sounds.push({ sound_id: id, volume });
      } else {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      console.log(`   ⚠ Skipping "${mixDef.name}": missing sounds: ${missing.join(', ')}`);
      skipped++;
      continue;
    }

    if (sounds.length === 0) {
      console.log(`   ⚠ Skipping "${mixDef.name}": no sounds.`);
      skipped++;
      continue;
    }

    await sleepSoundsService.createPredefinedMix({
      name: mixDef.name,
      description: mixDef.description,
      category: mixDef.category,
      is_premium: mixDef.is_premium,
      priority: mixDef.priority,
      is_published: true,
      sounds,
    });
    console.log(`   ✓ ${mixDef.name}`);
    created++;
  }

  console.log('\n' + '='.repeat(50));
  console.log(`   Created: ${created} mixes. Skipped: ${skipped}.`);
  console.log('='.repeat(50));

  await app.close();
}

bootstrap().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
