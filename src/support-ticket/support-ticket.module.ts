import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicketService } from './support-ticket.service';
import {
  SupportTicketController,
  AdminSupportTicketController,
} from './support-ticket.controller';
import {
  SupportTicket,
  SupportTicketMessage,
} from '../entities/support-ticket.entity';
import { User } from '../entities/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket, SupportTicketMessage, User]),
    EmailModule,
  ],
  controllers: [SupportTicketController, AdminSupportTicketController],
  providers: [SupportTicketService],
  exports: [SupportTicketService],
})
export class SupportTicketModule {}
