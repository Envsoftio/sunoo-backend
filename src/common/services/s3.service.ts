import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    const s3Config = this.configService.get('s3');
    this.bucket = s3Config.bucket;
    this.region = s3Config.region;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    this.logger.log(`S3 Service initialized for bucket: ${this.bucket}`);
  }

  /**
   * Upload a file to S3
   * @param file - The file buffer or stream
   * @param folder - The folder path in S3 (e.g., 'cast-pictures', 'story-covers')
   * @param filename - Optional custom filename, otherwise generates UUID
   * @param contentType - MIME type of the file
   * @returns The S3 key (path) of the uploaded file (e.g., 'cast-pictures/filename.png')
   */
  async uploadFile(
    file: Buffer | Uint8Array,
    folder: string,
    filename?: string,
    contentType?: string
  ): Promise<string> {
    try {
      const fileExtension = this.getFileExtension(filename || 'file');
      const key = filename
        ? `${folder}/${filename}`
        : `${folder}/${uuidv4()}${fileExtension}`;

      const uploadParams: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType || this.getContentType(fileExtension),
        // ACL removed - bucket should have public read access via bucket policy
        // If ACLs are disabled on the bucket, use bucket policy instead
      };

      const upload = new Upload({
        client: this.s3Client,
        params: uploadParams,
      });

      await upload.done();

      this.logger.log(`File uploaded successfully: ${key}`);

      // Return only the key (path), not the full URL
      return key;
    } catch (error) {
      this.logger.error(
        `Error uploading file to S3: ${error.message}`,
        error.stack
      );
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Upload a file from Multer file object
   * @param file - Multer file object
   * @param folder - The folder path in S3
   * @param filename - Optional custom filename
   * @returns The S3 key (path) of the uploaded file (e.g., 'cast-pictures/filename.png')
   */
  async uploadMulterFile(
    file: any,
    folder: string,
    filename?: string
  ): Promise<string> {
    return this.uploadFile(
      file.buffer,
      folder,
      filename || file.originalname,
      file.mimetype
    );
  }

  /**
   * Get the full S3 URL from a key (path)
   * @param key - The S3 key (path)
   * @returns The full S3 URL
   */
  getFileUrl(key: string): string {
    if (!key) return '';
    // If already a full URL, return as is
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.m3u8': 'application/vnd.apple.mpegurl',
      '.ts': 'video/mp2t',
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}
