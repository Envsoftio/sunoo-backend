import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Body,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        userId: {
          type: 'string',
          description: 'User ID',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - file missing or invalid',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        // Accept only images
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    })
  )
  async uploadAvatar(
    @UploadedFile() file: any,
    @Request() req: any,
    @Body('userId') userId?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    // Use userId from body if provided, otherwise use authenticated user from JWT
    const targetUserId = userId || req.user?.id;
    if (!targetUserId) {
      throw new BadRequestException('User ID is required');
    }
    return await this.uploadService.uploadAvatar(file, targetUserId);
  }

  @Post('cast-picture')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload cast member picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        storyId: {
          type: 'string',
          description: 'Story ID',
        },
        role: {
          type: 'string',
          description: 'Cast role',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cast picture uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - file missing or invalid',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    })
  )
  async uploadCastPicture(
    @UploadedFile() file: any,
    @Body('storyId') storyId?: string,
    @Body('role') role?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return await this.uploadService.uploadCastPicture(file, storyId, role);
  }

  @Post('book-cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload book cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        bookId: {
          type: 'string',
          description: 'Book ID',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Book cover uploaded successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - file missing or invalid',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    })
  )
  async uploadBookCover(
    @UploadedFile() file: any,
    @Body('bookId') bookId?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return await this.uploadService.uploadBookCover(file, bookId);
  }

  @Post('audio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload audio file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        storyId: {
          type: 'string',
          description: 'Story ID',
        },
        filename: {
          type: 'string',
          description: 'Custom filename (optional)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Audio file uploaded successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - file missing or invalid',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for audio files
      fileFilter: (req, file, cb) => {
        // Accept audio files
        if (!file.mimetype.match(/\/(mp3|mpeg|wav|ogg|m4a|aac)$/)) {
          return cb(new Error('Only audio files are allowed'), false);
        }
        cb(null, true);
      },
    })
  )
  async uploadAudio(
    @UploadedFile() file: any,
    @Body('storyId') storyId?: string,
    @Body('filename') filename?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return await this.uploadService.uploadAudio(file, storyId, filename);
  }

  @Post('sleep-sound-audio')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload sleep sound audio file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        soundId: {
          type: 'string',
          description: 'Sleep Sound ID (optional for new sounds)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Sleep sound audio uploaded successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - file missing or invalid',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for sleep sounds
      fileFilter: (req, file, cb) => {
        // Accept audio files
        if (!file.mimetype.match(/\/(mp3|mpeg|wav|ogg|m4a|aac)$/)) {
          return cb(new Error('Only audio files (mp3, wav, ogg, m4a, aac) are allowed'), false);
        }
        cb(null, true);
      },
    })
  )
  async uploadSleepSoundAudio(
    @UploadedFile() file: any,
    @Body('soundId') soundId?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return await this.uploadService.uploadSleepSoundAudio(file, soundId);
  }
}
