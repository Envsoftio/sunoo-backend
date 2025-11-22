import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PushNotificationService } from './push-notification.service';
import { PushNotificationController } from './push-notification.controller';
import { DeviceToken } from '../entities/device-token.entity';
import { User } from '../entities/user.entity';
import firebaseConfig from '../config/firebase.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceToken, User]),
    ConfigModule.forFeature(firebaseConfig),
  ],
  controllers: [PushNotificationController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class PushNotificationModule {}


