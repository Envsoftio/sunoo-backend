import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupportTicketService } from './support-ticket.service';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateSupportTicketMessageDto,
  UpdateSupportTicketMessageDto,
  SupportTicketQueryDto,
} from '../dto/support-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() createTicketDto: CreateSupportTicketDto,
    @Request() req
  ) {
    return await this.supportTicketService.createTicket(
      createTicketDto,
      req.user.id
    );
  }

  @Get()
  async findAllTickets(
    @Query() queryDto: SupportTicketQueryDto,
    @Request() req
  ) {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    return await this.supportTicketService.findAllTickets(
      queryDto,
      req.user.id,
      isAdmin
    );
  }

  @Get('stats')
  async getTicketStats(@Request() req) {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    return await this.supportTicketService.getTicketStats(req.user.id, isAdmin);
  }

  @Get(':id')
  async findTicketById(@Param('id') id: string, @Request() req) {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    return await this.supportTicketService.findTicketById(
      id,
      req.user.id,
      isAdmin
    );
  }

  @Get(':id/messages')
  async getMessages(@Param('id') ticketId: string, @Request() req) {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    return await this.supportTicketService.getMessages(
      ticketId,
      req.user.id,
      isAdmin
    );
  }

  @Patch(':id')
  async updateTicket(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateSupportTicketDto,
    @Request() req
  ) {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    return await this.supportTicketService.updateTicket(
      id,
      updateTicketDto,
      req.user.id,
      isAdmin
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTicket(@Param('id') id: string, @Request() req) {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    await this.supportTicketService.deleteTicket(id, req.user.id, isAdmin);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id') ticketId: string,
    @Body() createMessageDto: CreateSupportTicketMessageDto,
    @Request() req
  ) {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    return await this.supportTicketService.addMessage(
      ticketId,
      createMessageDto,
      req.user.id,
      isAdmin
    );
  }

  @Patch('messages/:messageId')
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateSupportTicketMessageDto,
    @Request() req
  ) {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    return await this.supportTicketService.updateMessage(
      messageId,
      updateMessageDto,
      req.user.id,
      isAdmin
    );
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Param('messageId') messageId: string, @Request() req) {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    await this.supportTicketService.deleteMessage(
      messageId,
      req.user.id,
      isAdmin
    );
  }
}

// Admin-only controller for ticket management
@Controller('admin/support-tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin', 'admin')
export class AdminSupportTicketController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  @Get()
  async findAllTickets(
    @Query() queryDto: SupportTicketQueryDto,
    @Request() req
  ) {
    return await this.supportTicketService.findAllTickets(
      queryDto,
      req.user.id,
      true
    );
  }

  @Get('stats')
  async getTicketStats(@Request() req) {
    return await this.supportTicketService.getTicketStats(req.user.id, true);
  }

  @Get(':id')
  async findTicketById(@Param('id') id: string, @Request() req) {
    return await this.supportTicketService.findTicketById(
      id,
      req.user.id,
      true
    );
  }

  @Patch(':id')
  async updateTicket(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateSupportTicketDto,
    @Request() req
  ) {
    return await this.supportTicketService.updateTicket(
      id,
      updateTicketDto,
      req.user.id,
      true
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTicket(@Param('id') id: string, @Request() req) {
    await this.supportTicketService.deleteTicket(id, req.user.id, true);
  }

  @Get(':id/messages')
  async getMessages(@Param('id') ticketId: string, @Request() req) {
    return await this.supportTicketService.getMessages(
      ticketId,
      req.user.id,
      true
    );
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id') ticketId: string,
    @Body() createMessageDto: CreateSupportTicketMessageDto,
    @Request() req
  ) {
    return await this.supportTicketService.addMessage(
      ticketId,
      createMessageDto,
      req.user.id,
      true
    );
  }

  @Patch('messages/:messageId')
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateSupportTicketMessageDto,
    @Request() req
  ) {
    return await this.supportTicketService.updateMessage(
      messageId,
      updateMessageDto,
      req.user.id,
      true
    );
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Param('messageId') messageId: string, @Request() req) {
    await this.supportTicketService.deleteMessage(messageId, req.user.id, true);
  }
}
