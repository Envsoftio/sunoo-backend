import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  SleepSound,
  SleepSoundCategory,
  AppSettings,
  SleepSoundAnalytics,
  SleepSoundSession,
  UserSoundMix,
  PredefinedSoundMix,
  User,
  Subscription,
  AnalyticsEventType,
} from '../entities';
import { S3Service } from '../common/services/s3.service';
import { CreateSoundDto } from './dto/create-sound.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { CreateUserMixDto } from './dto/create-user-mix.dto';
import { CreatePredefinedMixDto } from './dto/create-predefined-mix.dto';

@Injectable()
export class SleepSoundsService {
  constructor(
    @InjectRepository(SleepSound)
    private soundRepository: Repository<SleepSound>,
    @InjectRepository(SleepSoundCategory)
    private categoryRepository: Repository<SleepSoundCategory>,
    @InjectRepository(AppSettings)
    private settingsRepository: Repository<AppSettings>,
    @InjectRepository(SleepSoundAnalytics)
    private analyticsRepository: Repository<SleepSoundAnalytics>,
    @InjectRepository(SleepSoundSession)
    private sessionRepository: Repository<SleepSoundSession>,
    @InjectRepository(UserSoundMix)
    private userMixRepository: Repository<UserSoundMix>,
    @InjectRepository(PredefinedSoundMix)
    private predefinedMixRepository: Repository<PredefinedSoundMix>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private s3Service: S3Service,
    private configService: ConfigService
  ) {}

  // Categories
  async createCategory(dto: CreateCategoryDto): Promise<SleepSoundCategory> {
    const category = this.categoryRepository.create(dto);
    return await this.categoryRepository.save(category);
  }

  async updateCategory(
    id: string,
    dto: Partial<CreateCategoryDto>
  ): Promise<SleepSoundCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    Object.assign(category, dto);
    return await this.categoryRepository.save(category);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.categoryRepository.delete(id);
  }

  async getAllCategories(publishedOnly = false): Promise<SleepSoundCategory[]> {
    const where = publishedOnly ? { is_published: true } : {};
    return await this.categoryRepository.find({
      where,
      order: { priority: 'ASC', name: 'ASC' },
    });
  }

  // Sounds
  async createSound(dto: CreateSoundDto): Promise<SleepSound> {
    const sound = this.soundRepository.create(dto);
    return await this.soundRepository.save(sound);
  }

  async updateSound(
    id: string,
    dto: Partial<CreateSoundDto>
  ): Promise<SleepSound> {
    const sound = await this.soundRepository.findOne({ where: { id } });
    if (!sound) {
      throw new NotFoundException('Sound not found');
    }
    Object.assign(sound, dto);
    return await this.soundRepository.save(sound);
  }

  async deleteSound(id: string): Promise<void> {
    const sound = await this.soundRepository.findOne({ where: { id } });
    if (sound && sound.audio_url) {
      // TODO: Delete from S3 when deleteFile method is implemented
      // await this.s3Service.deleteFile(sound.audio_url);
    }
    await this.soundRepository.delete(id);
  }

  async getAllSounds(filters?: {
    category_id?: string;
    is_published?: boolean;
    is_premium?: boolean;
  }): Promise<SleepSound[]> {
    const where: any = {};
    if (filters?.category_id) where.category_id = filters.category_id;
    if (filters?.is_published !== undefined)
      where.is_published = filters.is_published;
    if (filters?.is_premium !== undefined)
      where.is_premium = filters.is_premium;

    const sounds = await this.soundRepository.find({
      where,
      relations: ['category'],
      order: { priority: 'ASC', name: 'ASC' },
    });

    // Add full S3 URLs
    return sounds.map(sound => this.attachS3Url(sound));
  }

  async getSoundById(id: string): Promise<SleepSound> {
    const sound = await this.soundRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!sound) {
      throw new NotFoundException('Sound not found');
    }
    return this.attachS3Url(sound);
  }

  // Sounds for users (with access control)
  async getSoundsForUser(userId?: string): Promise<any> {
    const isUserPremium = userId ? await this.isUserPremium(userId) : false;
    const freeSoundLimit = await this.getSetting(
      'free_sleep_sounds_limit',
      '5'
    );
    const maxSimultaneous = await this.getSetting(
      'max_simultaneous_sounds',
      '5'
    );
    const canSearch =
      isUserPremium ||
      (await this.getSetting('search_filter_premium_only', 'true')) === 'false';

    // Get all published sounds
    const allSounds = await this.soundRepository.find({
      where: { is_published: true },
      relations: ['category'],
      order: { priority: 'ASC', name: 'ASC' },
    });

    // Get categories
    const categories = await this.categoryRepository.find({
      where: { is_published: true },
      order: { priority: 'ASC', name: 'ASC' },
    });

    let accessibleSounds = allSounds;
    let totalSounds = allSounds.length;

    if (!isUserPremium) {
      // Filter non-premium sounds
      const nonPremiumSounds = allSounds.filter(s => !s.is_premium);
      // Take only first N sounds
      accessibleSounds = nonPremiumSounds.slice(0, parseInt(freeSoundLimit));
    }

    // Mark sounds as locked/unlocked
    const soundsWithAccess = allSounds.map(sound => {
      const isAccessible = accessibleSounds.some(s => s.id === sound.id);
      return {
        ...this.attachS3Url(sound),
        is_locked: !isAccessible,
      };
    });

    const [predefinedMixes, userMixes] = await Promise.all([
      this.getPredefinedMixes(userId ?? undefined),
      userId ? this.getUserMixes(userId) : Promise.resolve([]),
    ]);

    return {
      categories: categories.map(cat => ({
        ...cat,
        icon_url: cat.icon ? this.s3Service.getFileUrl(cat.icon) : null,
        sound_count: allSounds.filter(s => s.category_id === cat.id).length,
      })),
      sounds: soundsWithAccess,
      user_limits: {
        is_premium: isUserPremium,
        free_sound_limit: parseInt(freeSoundLimit),
        max_simultaneous_sounds: parseInt(maxSimultaneous),
        can_search: canSearch,
        can_create_mixes: isUserPremium,
        sounds_available: accessibleSounds.length,
        total_sounds: totalSounds,
        locked_sounds: totalSounds - accessibleSounds.length,
      },
      filter_options: {
        moods: ['calm', 'energizing', 'focus', 'sleep', 'meditation'],
        intensities: ['low', 'medium', 'high'],
        tags: await this.getAllUniqueTags(),
      },
      predefined_mixes: predefinedMixes,
      user_mixes: userMixes,
    };
  }

  // Analytics
  async startSession(
    userId: string | null,
    dto: StartSessionDto
  ): Promise<{ session_id: string }> {
    const session = this.sessionRepository.create({
      user_id: userId,
      started_at: new Date(),
      sounds_played: dto.sound_ids,
    });
    const saved = await this.sessionRepository.save(session);

    if (dto.predefined_mix_id) {
      await this.predefinedMixRepository.increment(
        { id: dto.predefined_mix_id },
        'play_count',
        1
      );
    }

    return { session_id: saved.id };
  }

  async trackEvent(
    userId: string | null,
    dto: CreateAnalyticsEventDto
  ): Promise<void> {
    const event = this.analyticsRepository.create({
      user_id: userId,
      ...dto,
    });
    await this.analyticsRepository.save(event);

    // Update play count and unique listeners
    if (dto.event_type === AnalyticsEventType.PLAY) {
      await this.soundRepository.increment(
        { id: dto.sound_id },
        'play_count',
        1
      );
      if (userId) {
        // Check if this is first time user plays this sound
        const existingPlays = await this.analyticsRepository.count({
          where: {
            user_id: userId,
            sound_id: dto.sound_id,
            event_type: AnalyticsEventType.PLAY,
          },
        });
        if (existingPlays === 1) {
          await this.soundRepository.increment(
            { id: dto.sound_id },
            'unique_listeners',
            1
          );
        }
      }
    }
  }

  async endSession(dto: EndSessionDto): Promise<void> {
    await this.sessionRepository.update(dto.session_id, {
      ended_at: new Date(),
      total_duration_seconds: dto.total_duration_seconds,
      completed_naturally: dto.completed_naturally,
    });
  }

  // User Mixes
  async createUserMix(
    userId: string,
    dto: CreateUserMixDto
  ): Promise<UserSoundMix> {
    const isPremium = await this.isUserPremium(userId);
    if (!isPremium) {
      throw new BadRequestException(
        'Premium subscription required to create custom mixes'
      );
    }

    // Validate all sounds exist and are accessible
    await this.validateSoundsAccess(
      userId,
      dto.sounds.map(s => s.sound_id)
    );

    const mix = this.userMixRepository.create({
      user_id: userId,
      name: dto.name,
      description: dto.description,
      mix_data: { sounds: dto.sounds },
    });
    return await this.userMixRepository.save(mix);
  }

  async getUserMixes(userId: string): Promise<any[]> {
    const mixes = await this.userMixRepository.find({
      where: { user_id: userId },
      order: { is_favorite: 'DESC', created_at: 'DESC' },
    });

    return await Promise.all(
      mixes.map(mix => this.enrichMixWithSoundDetails(mix))
    );
  }

  async updateUserMix(
    userId: string,
    mixId: string,
    dto: Partial<CreateUserMixDto>
  ): Promise<UserSoundMix> {
    const mix = await this.userMixRepository.findOne({
      where: { id: mixId, user_id: userId },
    });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }

    if (dto.sounds) {
      await this.validateSoundsAccess(
        userId,
        dto.sounds.map(s => s.sound_id)
      );
      mix.mix_data = { sounds: dto.sounds };
    }

    if (dto.name) mix.name = dto.name;
    if (dto.description !== undefined) mix.description = dto.description;

    return await this.userMixRepository.save(mix);
  }

  async deleteUserMix(userId: string, mixId: string): Promise<void> {
    await this.userMixRepository.delete({ id: mixId, user_id: userId });
  }

  // Predefined Mixes
  async createPredefinedMix(
    dto: CreatePredefinedMixDto
  ): Promise<PredefinedSoundMix> {
    const mix = this.predefinedMixRepository.create({
      ...dto,
      mix_data: { sounds: dto.sounds },
    });
    return await this.predefinedMixRepository.save(mix);
  }

  /** Admin: get all predefined mixes (no status filter). */
  async getAllPredefinedMixesForAdmin(): Promise<any[]> {
    const mixes = await this.predefinedMixRepository.find({
      order: { priority: 'ASC', name: 'ASC' },
    });
    return mixes.map(m => ({
      ...m,
      cover_image_url: m.cover_image
        ? this.s3Service.getFileUrl(m.cover_image)
        : null,
    }));
  }

  async getPredefinedMixes(userId?: string): Promise<any[]> {
    const isUserPremium = userId ? await this.isUserPremium(userId) : false;

    const where: any = { is_published: true };
    if (!isUserPremium) {
      where.is_premium = false;
    }

    const mixes = await this.predefinedMixRepository.find({
      where,
      order: { priority: 'ASC', name: 'ASC' },
    });

    return await Promise.all(
      mixes.map(mix => this.enrichPredefinedMixWithDetails(mix, isUserPremium))
    );
  }

  async updatePredefinedMix(
    id: string,
    dto: Partial<CreatePredefinedMixDto>
  ): Promise<PredefinedSoundMix> {
    const mix = await this.predefinedMixRepository.findOne({ where: { id } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }

    if (dto.sounds) {
      mix.mix_data = { sounds: dto.sounds };
    }
    Object.assign(mix, dto);
    return await this.predefinedMixRepository.save(mix);
  }

  async deletePredefinedMix(id: string): Promise<void> {
    await this.predefinedMixRepository.delete(id);
  }

  // Settings
  async getSetting(key: string, defaultValue: string): Promise<string> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting?.value || defaultValue;
  }

  async updateSetting(key: string, value: string): Promise<AppSettings> {
    let setting = await this.settingsRepository.findOne({ where: { key } });
    if (!setting) {
      setting = this.settingsRepository.create({ key, value });
    } else {
      setting.value = value;
    }
    return await this.settingsRepository.save(setting);
  }

  async getAllSettings(): Promise<AppSettings[]> {
    return await this.settingsRepository.find();
  }

  // Admin analytics
  async getSessionsForAdmin(limit = 50, offset = 0): Promise<any[]> {
    const sessions = await this.sessionRepository.find({
      relations: ['user'],
      order: { started_at: 'DESC' },
      take: limit,
      skip: offset,
    });
    return sessions.map(s => ({
      id: s.id,
      user_id: s.user_id,
      user_email: s.user?.email ?? null,
      started_at: s.started_at,
      ended_at: s.ended_at,
      total_duration_seconds: s.total_duration_seconds,
      sounds_played: s.sounds_played,
      timer_duration_minutes: s.timer_duration_minutes,
      completed_naturally: s.completed_naturally,
    }));
  }

  async getAnalyticsOverview(): Promise<{
    total_sessions: number;
    total_play_events: number;
    unique_listeners: number;
    total_listen_seconds: number;
    sessions_with_timer: number;
  }> {
    const [
      totalSessions,
      totalPlayEvents,
      uniqueListeners,
      sumDuration,
      sessionsWithTimer,
    ] = await Promise.all([
      this.sessionRepository.count(),
      this.analyticsRepository.count({
        where: { event_type: AnalyticsEventType.PLAY },
      }),
      this.analyticsRepository
        .createQueryBuilder('a')
        .select('COUNT(DISTINCT a.user_id)', 'count')
        .where('a.user_id IS NOT NULL')
        .getRawOne()
        .then(r => parseInt(r?.count ?? '0', 10)),
      this.analyticsRepository
        .createQueryBuilder('a')
        .select('COALESCE(SUM(a.duration_listened_seconds), 0)', 'sum')
        .getRawOne()
        .then(r => parseInt(r?.sum ?? '0', 10)),
      this.sessionRepository
        .createQueryBuilder('s')
        .where('s.timer_duration_minutes IS NOT NULL')
        .getCount(),
    ]);
    return {
      total_sessions: totalSessions,
      total_play_events: totalPlayEvents,
      unique_listeners: uniqueListeners,
      total_listen_seconds: sumDuration,
      sessions_with_timer: sessionsWithTimer,
    };
  }

  async getTopSoundsByPlays(limit = 20): Promise<any[]> {
    const sounds = await this.soundRepository.find({
      order: { play_count: 'DESC' },
      take: limit,
      relations: ['category'],
    });
    return sounds.map(s => ({
      id: s.id,
      name: s.name,
      category_name: s.category?.name ?? null,
      play_count: s.play_count,
      unique_listeners: s.unique_listeners,
    }));
  }

  // Helper methods
  private async isUserPremium(userId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { user_id: userId },
    });

    if (!subscription) return false;

    // Check if subscription is active
    return subscription.status === 'active';
  }

  private attachS3Url(sound: SleepSound): any {
    return {
      ...sound,
      audio_url: this.s3Service.getFileUrl(sound.audio_url),
    };
  }

  private async getAllUniqueTags(): Promise<string[]> {
    const sounds = await this.soundRepository.find({ select: ['tags'] });
    const allTags = sounds.flatMap(s => s.tags || []);
    return [...new Set(allTags)];
  }

  private async validateSoundsAccess(
    userId: string,
    soundIds: string[]
  ): Promise<void> {
    const userSounds = await this.getSoundsForUser(userId);
    const accessibleSoundIds = userSounds.sounds
      .filter(s => !s.is_locked)
      .map(s => s.id);

    const inaccessibleSounds = soundIds.filter(
      id => !accessibleSoundIds.includes(id)
    );
    if (inaccessibleSounds.length > 0) {
      throw new BadRequestException(
        'Some sounds are not accessible to this user'
      );
    }
  }

  private async enrichMixWithSoundDetails(mix: UserSoundMix): Promise<any> {
    const soundIds = mix.mix_data.sounds.map(s => s.sound_id);
    const sounds = await this.soundRepository.find({
      where: { id: In(soundIds) },
    });

    return {
      ...mix,
      sounds: mix.mix_data.sounds.map(mixSound => {
        const sound = sounds.find(s => s.id === mixSound.sound_id);
        return {
          sound_id: mixSound.sound_id,
          sound_name: sound?.name || 'Unknown',
          volume: mixSound.volume,
        };
      }),
    };
  }

  private async enrichPredefinedMixWithDetails(
    mix: PredefinedSoundMix,
    isUserPremium: boolean
  ): Promise<any> {
    const soundIds = mix.mix_data?.sounds?.map(s => s.sound_id) ?? [];
    const sounds = soundIds.length
      ? await this.soundRepository.find({ where: { id: In(soundIds) } })
      : [];

    return {
      id: mix.id,
      name: mix.name,
      description: mix.description ?? null,
      category: mix.category ?? null,
      is_premium: mix.is_premium,
      is_locked: mix.is_premium && !isUserPremium,
      play_count: mix.play_count ?? 0,
      cover_image_url: mix.cover_image
        ? this.s3Service.getFileUrl(mix.cover_image)
        : null,
      sounds: (mix.mix_data?.sounds ?? []).map(mixSound => {
        const sound = sounds.find(s => s.id === mixSound.sound_id);
        return {
          sound_id: mixSound.sound_id,
          sound_name: sound?.name ?? 'Unknown',
          volume: mixSound.volume,
          audio_url: sound ? this.s3Service.getFileUrl(sound.audio_url) : null,
        };
      }),
    };
  }
}
