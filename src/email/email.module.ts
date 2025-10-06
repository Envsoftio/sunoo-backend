import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { ZeptomailService } from './zeptomail.service';
import emailConfig from '../config/email.config';

@Module({
  imports: [ConfigModule.forFeature(emailConfig)],
  providers: [EmailService, ZeptomailService],
  exports: [EmailService, ZeptomailService],
})
export class EmailModule {}
