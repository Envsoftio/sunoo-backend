import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SleepSoundsService } from './sleep-sounds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { CreateUserMixDto } from './dto/create-user-mix.dto';

@ApiTags('Sleep Sounds')
@Controller('api/sleep-sounds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SleepSoundsController {
  constructor(private readonly sleepSoundsService: SleepSoundsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get all published sleep sound categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories() {
    return await this.sleepSoundsService.getAllCategories(true);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sleep sounds for user (with access control)' })
  @ApiResponse({ status: 200, description: 'Sounds retrieved successfully' })
  async getSounds(@Request() req) {
    return await this.sleepSoundsService.getSoundsForUser(req.user.id);
  }

  @Get('categories/:id/sounds')
  @ApiOperation({ summary: 'Get sounds by category' })
  @ApiResponse({ status: 200, description: 'Sounds retrieved successfully' })
  async getSoundsByCategory(@Param('id') categoryId: string, @Request() req) {
    const allSounds = await this.sleepSoundsService.getSoundsForUser(req.user.id);
    return {
      ...allSounds,
      sounds: allSounds.sounds.filter(s => s.category_id === categoryId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single sound by ID' })
  @ApiResponse({ status: 200, description: 'Sound retrieved successfully' })
  async getSoundById(@Param('id') id: string) {
    return await this.sleepSoundsService.getSoundById(id);
  }

  // Analytics endpoints
  @Post('analytics/session/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start listening session' })
  @ApiResponse({ status: 200, description: 'Session started successfully' })
  async startSession(@Request() req, @Body() dto: StartSessionDto) {
    return await this.sleepSoundsService.startSession(req.user.id, dto);
  }

  @Post('analytics/event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track playback event' })
  @ApiResponse({ status: 200, description: 'Event tracked successfully' })
  async trackEvent(@Request() req, @Body() dto: CreateAnalyticsEventDto) {
    await this.sleepSoundsService.trackEvent(req.user.id, dto);
    return { success: true };
  }

  @Post('analytics/session/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End listening session' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  async endSession(@Body() dto: EndSessionDto) {
    await this.sleepSoundsService.endSession(dto);
    return { success: true };
  }

  // User Mix endpoints
  @Get('mixes/predefined')
  @ApiOperation({ summary: 'Get predefined mixes' })
  @ApiResponse({ status: 200, description: 'Mixes retrieved successfully' })
  async getPredefinedMixes(@Request() req) {
    return await this.sleepSoundsService.getPredefinedMixes(req.user.id);
  }

  @Get('mixes/user')
  @ApiOperation({ summary: 'Get user custom mixes (Premium only)' })
  @ApiResponse({ status: 200, description: 'Mixes retrieved successfully' })
  async getUserMixes(@Request() req) {
    return await this.sleepSoundsService.getUserMixes(req.user.id);
  }

  @Post('mixes/user')
  @ApiOperation({ summary: 'Create custom mix (Premium only)' })
  @ApiResponse({ status: 201, description: 'Mix created successfully' })
  async createUserMix(@Request() req, @Body() dto: CreateUserMixDto) {
    return await this.sleepSoundsService.createUserMix(req.user.id, dto);
  }

  @Put('mixes/user/:id')
  @ApiOperation({ summary: 'Update custom mix (Premium only)' })
  @ApiResponse({ status: 200, description: 'Mix updated successfully' })
  async updateUserMix(
    @Request() req,
    @Param('id') mixId: string,
    @Body() dto: Partial<CreateUserMixDto>,
  ) {
    return await this.sleepSoundsService.updateUserMix(req.user.id, mixId, dto);
  }

  @Delete('mixes/user/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete custom mix' })
  @ApiResponse({ status: 204, description: 'Mix deleted successfully' })
  async deleteUserMix(@Request() req, @Param('id') mixId: string) {
    await this.sleepSoundsService.deleteUserMix(req.user.id, mixId);
  }
}
