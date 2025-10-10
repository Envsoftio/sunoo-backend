import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import {
  SupportTicket,
  SupportTicketMessage,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '../entities/support-ticket.entity';
import { User } from '../entities/user.entity';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateSupportTicketMessageDto,
  UpdateSupportTicketMessageDto,
  SupportTicketQueryDto,
} from '../dto/support-ticket.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class SupportTicketService {
  private readonly logger = new Logger(SupportTicketService.name);

  constructor(
    @InjectRepository(SupportTicket)
    private supportTicketRepository: Repository<SupportTicket>,
    @InjectRepository(SupportTicketMessage)
    private supportTicketMessageRepository: Repository<SupportTicketMessage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService
  ) {}

  async createTicket(
    createTicketDto: CreateSupportTicketDto,
    userId: string
  ): Promise<SupportTicket> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ticket = this.supportTicketRepository.create({
      ...createTicketDto,
      userId,
      user,
    });

    const savedTicket = await this.supportTicketRepository.save(ticket);

    // Send email notifications
    try {
      // Send confirmation email to user
      await this.emailService.sendSupportTicketCreatedEmail(
        user.email,
        user.name,
        savedTicket
      );

      // Send notification email to admin
      await this.emailService.sendSupportTicketAdminNotification(
        savedTicket,
        user
      );

      this.logger.log(`Email notifications sent for ticket #${savedTicket.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email notifications for ticket #${savedTicket.id}:`,
        error
      );
      // Don't throw error - ticket creation should succeed even if emails fail
    }

    return savedTicket;
  }

  async findAllTickets(
    queryDto: SupportTicketQueryDto,
    userId: string,
    isAdmin: boolean = false
  ): Promise<{ tickets: SupportTicket[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = queryDto;

    const where: FindOptionsWhere<SupportTicket> = {};

    // If not admin, only show user's own tickets
    if (!isAdmin) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (category) {
      where.category = category;
    }

    const queryBuilder = this.supportTicketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .leftJoinAndSelect('ticket.messages', 'messages')
      .leftJoinAndSelect('messages.user', 'messageUser')
      .where(where);

    if (search) {
      queryBuilder.andWhere(
        '(ticket.title ILIKE :search OR ticket.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const skip = (page - 1) * limit;
    const [tickets, total] = await queryBuilder
      .orderBy(`ticket.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { tickets, total };
  }

  async findTicketById(
    id: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<SupportTicket> {
    const ticket = await this.supportTicketRepository.findOne({
      where: { id },
      relations: ['user', 'messages', 'messages.user'],
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Check if user can access this ticket
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException(
        'You can only view your own support tickets'
      );
    }

    return ticket;
  }

  async updateTicket(
    id: string,
    updateTicketDto: UpdateSupportTicketDto,
    userId: string,
    isAdmin: boolean = false
  ): Promise<SupportTicket> {
    const ticket = await this.findTicketById(id, userId, isAdmin);

    // Only allow users to update their own tickets, or admins to update any ticket
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException(
        'You can only update your own support tickets'
      );
    }

    const previousStatus = ticket.status;

    // If admin is closing the ticket, set closedAt and closedBy
    if (
      isAdmin &&
      updateTicketDto.status === TicketStatus.CLOSED &&
      ticket.status !== TicketStatus.CLOSED
    ) {
      updateTicketDto.closedAt = new Date();
      updateTicketDto.closedBy = userId;
    }

    Object.assign(ticket, updateTicketDto);
    const updatedTicket = await this.supportTicketRepository.save(ticket);

    // Send email notification if status changed and user is not the one making the change
    if (previousStatus !== updatedTicket.status && isAdmin) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: updatedTicket.userId },
        });
        if (user) {
          await this.emailService.sendSupportTicketUpdatedEmail(
            user.email,
            user.name,
            updatedTicket
          );
          this.logger.log(
            `Status update email sent for ticket #${updatedTicket.id}`
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to send status update email for ticket #${updatedTicket.id}:`,
          error
        );
      }
    }

    return updatedTicket;
  }

  async deleteTicket(
    id: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<void> {
    const ticket = await this.findTicketById(id, userId, isAdmin);

    // Only allow users to delete their own tickets, or admins to delete any ticket
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own support tickets'
      );
    }

    await this.supportTicketRepository.remove(ticket);
  }

  async getMessages(
    ticketId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<SupportTicketMessage[]> {
    const ticket = await this.findTicketById(ticketId, userId, isAdmin);

    return await this.supportTicketMessageRepository.find({
      where: { ticketId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  async addMessage(
    ticketId: string,
    createMessageDto: CreateSupportTicketMessageDto,
    userId: string,
    isAdmin: boolean = false
  ): Promise<SupportTicketMessage> {
    const ticket = await this.findTicketById(ticketId, userId, isAdmin);

    // Check if ticket is closed
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Cannot add messages to closed tickets');
    }

    const newMessage = this.supportTicketMessageRepository.create({
      ...createMessageDto,
      ticketId,
      userId,
    });

    const savedMessage =
      await this.supportTicketMessageRepository.save(newMessage);

    // Update ticket response count and last response info
    ticket.responseCount += 1;
    ticket.lastResponseAt = new Date();
    ticket.lastResponseBy = userId;

    // If user is responding, change status to in_progress if it was open
    if (!isAdmin && ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }

    await this.supportTicketRepository.save(ticket);

    const message = await this.supportTicketMessageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['user', 'ticket'],
    });

    if (!message) {
      throw new NotFoundException('Message not found after creation');
    }

    // Send email notification if admin is responding
    if (isAdmin) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: ticket.userId },
        });
        if (user) {
          await this.emailService.sendSupportTicketUpdatedEmail(
            user.email,
            user.name,
            ticket,
            createMessageDto.content
          );
          this.logger.log(`Admin response email sent for ticket #${ticket.id}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to send admin response email for ticket #${ticket.id}:`,
          error
        );
      }
    }

    return message;
  }

  async updateMessage(
    messageId: string,
    updateMessageDto: UpdateSupportTicketMessageDto,
    userId: string,
    isAdmin: boolean = false
  ): Promise<SupportTicketMessage> {
    const message = await this.supportTicketMessageRepository.findOne({
      where: { id: messageId },
      relations: ['ticket', 'user'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user can update this message
    if (!isAdmin && message.userId !== userId) {
      throw new ForbiddenException('You can only update your own messages');
    }

    Object.assign(message, updateMessageDto);
    return await this.supportTicketMessageRepository.save(message);
  }

  async deleteMessage(
    messageId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<void> {
    const message = await this.supportTicketMessageRepository.findOne({
      where: { id: messageId },
      relations: ['ticket'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user can delete this message
    if (!isAdmin && message.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.supportTicketMessageRepository.remove(message);

    // Update ticket response count
    const ticket = await this.supportTicketRepository.findOne({
      where: { id: message.ticketId },
    });

    if (ticket) {
      ticket.responseCount = Math.max(0, ticket.responseCount - 1);
      await this.supportTicketRepository.save(ticket);
    }
  }

  async getTicketStats(userId: string, isAdmin: boolean = false): Promise<any> {
    const where: FindOptionsWhere<SupportTicket> = {};

    if (!isAdmin) {
      where.userId = userId;
    }

    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.supportTicketRepository.count({ where }),
      this.supportTicketRepository.count({
        where: { ...where, status: TicketStatus.OPEN },
      }),
      this.supportTicketRepository.count({
        where: { ...where, status: TicketStatus.IN_PROGRESS },
      }),
      this.supportTicketRepository.count({
        where: { ...where, status: TicketStatus.RESOLVED },
      }),
      this.supportTicketRepository.count({
        where: { ...where, status: TicketStatus.CLOSED },
      }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
    };
  }
}
