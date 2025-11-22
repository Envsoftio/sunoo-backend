import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { DeviceToken, Platform } from '../entities/device-token.entity';
import { User } from '../entities/user.entity';
import { NotificationType } from '../dto/push-notification.dto';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private messaging: admin.messaging.Messaging;

  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService
  ) {
    // Initialize Firebase Admin SDK
    const firebaseConfig = this.configService.get('firebase');
    if (firebaseConfig && firebaseConfig.messaging) {
      this.messaging = firebaseConfig.messaging;
    } else {
      // Fallback initialization
      if (!admin.apps.length) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(
          /\\n/g,
          '\n'
        );
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        if (projectId && privateKey && clientEmail) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              privateKey,
              clientEmail,
            }),
          });
          this.messaging = admin.messaging();
        } else {
          this.logger.warn(
            'Firebase not configured. Push notifications will not work.'
          );
        }
      } else {
        this.messaging = admin.messaging();
      }
    }
  }

  /**
   * Register or update a device token
   */
  async registerDeviceToken(
    token: string,
    platform: Platform,
    userId?: string,
    deviceId?: string,
    deviceInfo?: any
  ): Promise<DeviceToken> {
    try {
      // Check if token already exists
      let deviceToken = await this.deviceTokenRepository.findOne({
        where: { token },
      });

      if (deviceToken) {
        // Update existing token
        deviceToken.userId = userId || deviceToken.userId;
        deviceToken.platform = platform;
        deviceToken.deviceId = deviceId || deviceToken.deviceId;
        deviceToken.deviceInfo = deviceInfo || deviceToken.deviceInfo;
        deviceToken.isActive = true;
        deviceToken.lastUsedAt = new Date();
      } else {
        // Create new token
        deviceToken = this.deviceTokenRepository.create({
          token,
          platform,
          userId,
          deviceId,
          deviceInfo,
          isActive: true,
          lastUsedAt: new Date(),
        });
      }

      return await this.deviceTokenRepository.save(deviceToken);
    } catch (error) {
      this.logger.error(
        `Error registering device token: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    try {
      await this.deviceTokenRepository.update({ token }, { isActive: false });
    } catch (error) {
      this.logger.error(
        `Error unregistering device token: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Check if user has enabled notifications for the given type
   * Note: New content notifications (new story/chapter) are always enabled
   */
  private shouldSendNotification(
    user: User | null,
    notificationType: NotificationType
  ): boolean {
    if (!user) {
      // Anonymous users - send all notifications
      return true;
    }

    // New content notifications are always enabled (cannot be disabled)
    if (notificationType === NotificationType.NEW_CONTENT) {
      return true;
    }

    // Check general push notifications setting
    if (!user.push_notifications_enabled) {
      return false;
    }

    // Check type-specific settings
    switch (notificationType) {
      case NotificationType.SUBSCRIPTION:
        return user.push_subscription_enabled;
      case NotificationType.ENGAGEMENT:
        return user.push_engagement_enabled;
      case NotificationType.MARKETING:
        return user.push_marketing_enabled;
      case NotificationType.CUSTOM:
        return true; // Custom notifications respect general setting only
      default:
        return true;
    }
  }

  /**
   * Send notification to a single device
   */
  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: any,
    notificationType: NotificationType = NotificationType.CUSTOM
  ): Promise<boolean> {
    if (!this.messaging) {
      this.logger.warn(
        'Firebase messaging not initialized. Cannot send notification.'
      );
      return false;
    }

    try {
      // Get device token to check user preferences
      const deviceToken = await this.deviceTokenRepository.findOne({
        where: { token, isActive: true },
        relations: ['user'],
      });

      if (!deviceToken) {
        this.logger.warn(`Device token not found or inactive: ${token}`);
        return false;
      }

      // Check user preferences (except for new content notifications)
      if (
        !this.shouldSendNotification(deviceToken.user || null, notificationType)
      ) {
        this.logger.log(
          `Skipping notification to user ${deviceToken.userId} - preferences disabled for type ${notificationType}`
        );
        return false;
      }

      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data
          ? Object.keys(data).reduce(
              (acc, key) => {
                acc[key] = String(data[key]);
                return acc;
              },
              {} as Record<string, string>
            )
          : undefined,
        android: {
          priority: 'high',
          notification: {
            channelId: 'sunoo_notifications',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(`Successfully sent notification to device: ${response}`);

      // Update last used timestamp
      deviceToken.lastUsedAt = new Date();
      await this.deviceTokenRepository.save(deviceToken);

      return true;
    } catch (error: any) {
      this.logger.error(
        `Error sending notification to device: ${error.message}`,
        error.stack
      );

      // Handle invalid token errors
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        this.logger.log(`Removing invalid token: ${token}`);
        await this.unregisterDeviceToken(token);
      }

      return false;
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: any,
    notificationType: NotificationType = NotificationType.CUSTOM
  ): Promise<{ success: number; failed: number }> {
    if (!this.messaging || tokens.length === 0) {
      return { success: 0, failed: tokens.length };
    }

    // Get all device tokens with user relations
    const deviceTokens = await this.deviceTokenRepository.find({
      where: { token: In(tokens), isActive: true },
      relations: ['user'],
    });

    // Filter tokens based on user preferences
    const validTokens = deviceTokens
      .filter(dt =>
        this.shouldSendNotification(dt.user || null, notificationType)
      )
      .map(dt => dt.token);

    if (validTokens.length === 0) {
      this.logger.log('No valid tokens after preference filtering');
      return { success: 0, failed: tokens.length };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: {
          title,
          body,
        },
        data: data
          ? Object.keys(data).reduce(
              (acc, key) => {
                acc[key] = String(data[key]);
                return acc;
              },
              {} as Record<string, string>
            )
          : undefined,
        android: {
          priority: 'high',
          notification: {
            channelId: 'sunoo_notifications',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.sendEachForMulticast(message);
      this.logger.log(
        `Sent ${response.successCount} notifications, ${response.failureCount} failed`
      );

      // Update last used timestamps for successful sends
      const successfulTokens = validTokens.filter((token, index) => {
        return response.responses[index]?.success;
      });

      if (successfulTokens.length > 0) {
        await this.deviceTokenRepository.update(
          { token: In(successfulTokens) },
          { lastUsedAt: new Date() }
        );
      }

      // Remove invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, index) => {
        if (
          !resp.success &&
          (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered')
        ) {
          invalidTokens.push(validTokens[index]);
        }
      });

      if (invalidTokens.length > 0) {
        await this.deviceTokenRepository.update(
          { token: In(invalidTokens) },
          { isActive: false }
        );
        this.logger.log(`Removed ${invalidTokens.length} invalid tokens`);
      }

      return {
        success: response.successCount,
        failed: response.failureCount + (tokens.length - validTokens.length),
      };
    } catch (error: any) {
      this.logger.error(
        `Error sending multicast notification: ${error.message}`,
        error.stack
      );
      return { success: 0, failed: tokens.length };
    }
  }

  /**
   * Send notification to a user (all their devices)
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: any,
    notificationType: NotificationType = NotificationType.CUSTOM
  ): Promise<{ success: number; failed: number }> {
    const deviceTokens = await this.deviceTokenRepository.find({
      where: { userId, isActive: true },
    });

    if (deviceTokens.length === 0) {
      this.logger.log(`No active device tokens found for user ${userId}`);
      return { success: 0, failed: 0 };
    }

    const tokens = deviceTokens.map(dt => dt.token);
    return this.sendToDevices(tokens, title, body, data, notificationType);
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: any,
    notificationType: NotificationType = NotificationType.CUSTOM
  ): Promise<{ success: number; failed: number }> {
    const deviceTokens = await this.deviceTokenRepository.find({
      where: { userId: In(userIds), isActive: true },
    });

    if (deviceTokens.length === 0) {
      this.logger.log(`No active device tokens found for users`);
      return { success: 0, failed: 0 };
    }

    const tokens = deviceTokens.map(dt => dt.token);
    return this.sendToDevices(tokens, title, body, data, notificationType);
  }

  /**
   * Send notification to anonymous users (by device tokens)
   */
  async sendToAnonymousUsers(
    tokens: string[],
    title: string,
    body: string,
    data?: any,
    notificationType: NotificationType = NotificationType.CUSTOM
  ): Promise<{ success: number; failed: number }> {
    // Get tokens that don't have a userId
    const anonymousTokens = await this.deviceTokenRepository.find({
      where: { token: In(tokens), isActive: true },
    });

    const anonymousTokenStrings = anonymousTokens
      .filter(dt => !dt.userId)
      .map(dt => dt.token);

    if (anonymousTokenStrings.length === 0) {
      return { success: 0, failed: 0 };
    }

    return this.sendToDevices(
      anonymousTokenStrings,
      title,
      body,
      data,
      notificationType
    );
  }

  /**
   * Send notification to all users
   */
  async sendToAll(
    title: string,
    body: string,
    data?: any,
    notificationType: NotificationType = NotificationType.CUSTOM
  ): Promise<{ success: number; failed: number }> {
    const deviceTokens = await this.deviceTokenRepository.find({
      where: { isActive: true },
    });

    if (deviceTokens.length === 0) {
      return { success: 0, failed: 0 };
    }

    const tokens = deviceTokens.map(dt => dt.token);
    return this.sendToDevices(tokens, title, body, data, notificationType);
  }

  /**
   * Get device token statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    byPlatform: { android: number; ios: number };
    authenticated: number;
    anonymous: number;
  }> {
    const [total, active, android, ios, authenticated, anonymous] =
      await Promise.all([
        this.deviceTokenRepository.count(),
        this.deviceTokenRepository.count({ where: { isActive: true } }),
        this.deviceTokenRepository.count({
          where: { platform: Platform.ANDROID, isActive: true },
        }),
        this.deviceTokenRepository.count({
          where: { platform: Platform.IOS, isActive: true },
        }),
        this.deviceTokenRepository.count({
          where: { isActive: true, userId: Not(IsNull()) },
        }),
        this.deviceTokenRepository.count({
          where: { isActive: true, userId: IsNull() },
        }),
      ]);

    return {
      total,
      active,
      byPlatform: { android, ios },
      authenticated,
      anonymous,
    };
  }
}
