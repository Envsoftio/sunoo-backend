import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SleepSoundsService } from './sleep-sounds.service';
import { SleepSoundsController } from './sleep-sounds.controller';
import { S3Module } from '../common/services/s3.module';
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
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SleepSound,
      SleepSoundCategory,
      AppSettings,
      SleepSoundAnalytics,
      SleepSoundSession,
      UserSoundMix,
      PredefinedSoundMix,
      User,
      Subscription,
    ]),
    S3Module,
  ],
  providers: [SleepSoundsService],
  controllers: [SleepSoundsController],
  exports: [SleepSoundsService],
})
export class SleepSoundsModule {}
