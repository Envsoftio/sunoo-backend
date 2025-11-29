import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../common/services/s3.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Url: string;

  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {
    const s3Config = this.configService.get('s3');
    // Use hlsUrl if available, otherwise construct from bucket and region
    this.s3Url =
      s3Config.hlsUrl ||
      `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com`;
  }

  async uploadAvatar(file: any, userId?: string): Promise<any> {
    try {
      if (!userId) {
        throw new NotFoundException('User ID is required');
      }

      const folder = `users/${userId}`;
      const filename = 'picture.jpg';

      const fileKey = await this.s3Service.uploadMulterFile(
        file,
        folder,
        filename
      );

      const fileUrl = `${this.s3Url}/${fileKey}`;

      // Update user's avatar field in database with key only
      await this.userRepository.update(userId, { avatar: fileKey });

      return {
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          key: fileKey,
          url: fileUrl,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error uploading avatar: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async uploadCastPicture(
    file: any,
    storyId?: string,
    role?: string
  ): Promise<any> {
    try {
      // Sanitize role for filename
      const sanitizeRole = (role: string) => {
        return (
          role
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'unknown'
        );
      };

      const safeRole = role ? sanitizeRole(role) : 'unknown';
      const folder = 'casts';
      const filename = storyId ? `${storyId}-${safeRole}.jpg` : undefined;

      const fileKey = await this.s3Service.uploadMulterFile(
        file,
        folder,
        filename
      );

      const fileUrl = `${this.s3Url}/${fileKey}`;

      return {
        success: true,
        message: 'Cast picture uploaded successfully',
        data: {
          key: fileKey,
          url: fileUrl,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error uploading cast picture: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async uploadBookCover(file: any, bookId?: string): Promise<any> {
    try {
      const folder = bookId ? `stories/${bookId}` : 'books';
      const filename = bookId ? 'picture.jpg' : undefined;

      const fileKey = await this.s3Service.uploadMulterFile(
        file,
        folder,
        filename
      );

      const fileUrl = `${this.s3Url}/${fileKey}`;

      return {
        success: true,
        message: 'Book cover uploaded successfully',
        data: {
          key: fileKey,
          url: fileUrl,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error uploading book cover: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async uploadAudio(
    file: any,
    storyId?: string,
    customFilename?: string
  ): Promise<any> {
    try {
      const folder = storyId ? `stories/${storyId}` : 'stories';
      const filename = customFilename || file.originalname;

      const fileKey = await this.s3Service.uploadMulterFile(
        file,
        folder,
        filename
      );

      const fileUrl = `${this.s3Url}/${fileKey}`;

      return {
        success: true,
        message: 'Audio file uploaded successfully',
        data: {
          key: fileKey,
          url: fileUrl,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error uploading audio file: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
