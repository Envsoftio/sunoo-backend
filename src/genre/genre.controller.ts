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
  ApiQuery,
} from '@nestjs/swagger';
import { GenreService } from './genre.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/superadmin.guard';

@ApiTags('Genre')
@Controller('api/genre')
export class GenreController {
  constructor(private readonly genreService: GenreService) {}

  @Get()
  @ApiOperation({ summary: 'Get all genres' })
  @ApiResponse({ status: 200, description: 'Genres retrieved successfully' })
  async getAllGenres() {
    return await this.genreService.getAllGenres();
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured genres' })
  @ApiResponse({
    status: 200,
    description: 'Featured genres retrieved successfully',
  })
  async getFeaturedGenres() {
    return await this.genreService.getFeaturedGenres();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get genre statistics' })
  @ApiResponse({
    status: 200,
    description: 'Genre stats retrieved successfully',
  })
  async getGenreStats() {
    return await this.genreService.getGenreStats();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search genres' })
  @ApiResponse({ status: 200, description: 'Genres found successfully' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  async searchGenres(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return await this.genreService.searchGenres(query, page || 1, limit || 10);
  }

  @Get('stories/:slug')
  @ApiOperation({ summary: 'Get stories by genre slug' })
  @ApiResponse({
    status: 200,
    description: 'Genre stories retrieved successfully',
  })
  @ApiQuery({
    name: 'userId',
    description: 'User ID for bookmarks',
    required: false,
  })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  async getStoriesByGenre(
    @Param('slug') slug: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return await this.genreService.getStoriesByGenre(
      slug,
      userId,
      page || 1,
      limit || 10
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get genre by ID' })
  @ApiResponse({ status: 200, description: 'Genre retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  async getGenreById(@Param('id') id: string) {
    return await this.genreService.getGenreById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get genre by slug' })
  @ApiResponse({ status: 200, description: 'Genre retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  async getGenreBySlug(@Param('slug') slug: string) {
    return await this.genreService.getGenreBySlug(slug);
  }

  // Admin endpoints
  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create genre (Admin only)' })
  @ApiResponse({ status: 201, description: 'Genre created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createGenre(@Body() genreData: any) {
    return await this.genreService.createGenre(genreData);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update genre (Admin only)' })
  @ApiResponse({ status: 200, description: 'Genre updated successfully' })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateGenre(@Param('id') id: string, @Body() genreData: any) {
    return await this.genreService.updateGenre(id, genreData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete genre (Admin only)' })
  @ApiResponse({ status: 200, description: 'Genre deleted successfully' })
  @ApiResponse({ status: 404, description: 'Genre not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete genre with associated stories',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async deleteGenre(@Param('id') id: string) {
    return await this.genreService.deleteGenre(id);
  }
}
