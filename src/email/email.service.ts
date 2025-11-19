import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private emailConfig: any;

  constructor(private configService: ConfigService) {
    this.emailConfig = this.configService.get('email');
    this.createTransporter();
  }

  private createTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.emailConfig.smtp.host,
      port: this.emailConfig.smtp.port,
      secure: this.emailConfig.smtp.secure,
      auth: this.emailConfig.smtp.auth,
    });

    // Verify connection configuration
    this.transporter.verify((error, _success) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP server is ready to take our messages');
      }
    });
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"${this.emailConfig.from.name}" <${this.emailConfig.from.email}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${emailData.to}:`,
        info.messageId
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${emailData.to}:`, error);
      return false;
    }
  }

  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    verificationToken?: string
  ): Promise<boolean> {
    const template = this.loadTemplate('welcome');
    const data = {
      userName,
      userEmail,
      appName: this.emailConfig.templates.appName,
      appUrl: this.emailConfig.templates.appUrl,
      verificationUrl: verificationToken
        ? `${this.emailConfig.templates.baseUrl}/api/auth/verify-email?token=${verificationToken}`
        : null,
    };

    const html = template(data);
    return this.sendEmail({
      to: userEmail,
      subject: `Welcome to ${this.emailConfig.templates.appName}!`,
      html,
    });
  }

  async sendVerificationEmail(
    userEmail: string,
    userName: string,
    verificationToken: string
  ): Promise<boolean> {
    const template = this.loadTemplate('verification');
    const data = {
      userName,
      userEmail,
      appName: this.emailConfig.templates.appName,
      appUrl: this.emailConfig.templates.appUrl,
      verificationUrl: `${this.emailConfig.templates.appUrl}/email-verified?token=${verificationToken}`,
    };

    const html = template(data);
    return this.sendEmail({
      to: userEmail,
      subject: `Verify your ${this.emailConfig.templates.appName} account`,
      html,
    });
  }

  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetToken: string
  ): Promise<boolean> {
    const template = this.loadTemplate('password-reset');
    const data = {
      userName,
      userEmail,
      appName: this.emailConfig.templates.appName,
      appUrl: this.emailConfig.templates.appUrl,
      resetUrl: `${this.emailConfig.templates.appUrl}/reset-password?token=${resetToken}`,
    };

    const html = template(data);
    return this.sendEmail({
      to: userEmail,
      subject: `Reset your ${this.emailConfig.templates.appName} password`,
      html,
    });
  }

  async sendFeedbackNotification(
    feedbackData: any,
    adminEmail: string
  ): Promise<boolean> {
    const template = this.loadTemplate('feedback');
    const data = {
      name: feedbackData.name,
      email: feedbackData.email,
      type: feedbackData.type,
      message: feedbackData.message,
      submittedAt: new Date().toLocaleString(),
      appName: this.emailConfig.templates.appName,
    };

    const html = template(data);
    return this.sendEmail({
      to: adminEmail,
      subject: `New ${feedbackData.type} Feedback - ${this.emailConfig.templates.appName}`,
      html,
    });
  }

  async sendSupportTicketCreatedEmail(
    userEmail: string,
    userName: string,
    ticketData: any
  ): Promise<boolean> {
    const template = this.loadTemplate('support-ticket-created');
    const data = {
      userName,
      userEmail,
      ticketId: ticketData.id,
      title: ticketData.title,
      message: ticketData.description,
      status: ticketData.status,
      priority: ticketData.priority,
      category: ticketData.category,
      createdAt: new Date(ticketData.created_at).toLocaleString(),
      appName: this.emailConfig.templates.appName,
      appUrl: this.emailConfig.templates.appUrl,
    };

    const html = template(data);
    return this.sendEmail({
      to: userEmail,
      subject: `Support Ticket Created - ${ticketData.title} - ${this.emailConfig.templates.appName}`,
      html,
    });
  }

  async sendSupportTicketUpdatedEmail(
    userEmail: string,
    userName: string,
    ticketData: any,
    message?: string
  ): Promise<boolean> {
    const template = this.loadTemplate('support-ticket-updated');
    const data = {
      userName,
      userEmail,
      ticketId: ticketData.id,
      title: ticketData.title,
      status: ticketData.status,
      message,
      resolution: ticketData.resolution,
      updatedAt: new Date(ticketData.updated_at).toLocaleString(),
      isResolved: ticketData.status === 'closed',
      appName: this.emailConfig.templates.appName,
      appUrl: this.emailConfig.templates.appUrl,
    };

    const html = template(data);
    return this.sendEmail({
      to: userEmail,
      subject: `Support Ticket Updated - ${ticketData.title} - ${this.emailConfig.templates.appName}`,
      html,
    });
  }

  async sendSupportTicketAdminNotification(
    ticketData: any,
    userData: any
  ): Promise<boolean> {
    const template = this.loadTemplate('support-ticket-admin-notification');
    const data = {
      ticketId: ticketData.id,
      title: ticketData.title,
      message: ticketData.description,
      priority: ticketData.priority,
      category: ticketData.category,
      createdAt: new Date(ticketData.created_at).toLocaleString(),
      userName: userData.name,
      userEmail: userData.email,
      userId: userData.id,
      appName: this.emailConfig.templates.appName,
      adminUrl: this.emailConfig.templates.baseUrl,
    };

    const html = template(data);
    return this.sendEmail({
      to: this.emailConfig.adminEmail,
      subject: `New Support Ticket - ${ticketData.title} - ${ticketData.priority.toUpperCase()} - ${this.emailConfig.templates.appName}`,
      html,
    });
  }

  async sendSubscriptionAuthenticatedEmail(
    userEmail: string,
    userName: string,
    params: {
      planName?: string;
      planId?: string;
      subscriptionId?: string;
      startDate?: Date;
      nextBillingDate?: Date;
    } = {}
  ): Promise<boolean> {
    const template = this.loadTemplate('subscription-authenticated');
    const data = {
      userName,
      userEmail,
      appName: this.emailConfig.templates.appName,
      appUrl: this.emailConfig.templates.appUrl,
      planName: params.planName,
      planId: params.planId,
      subscriptionId: params.subscriptionId,
      startDateFormatted: params.startDate
        ? new Date(params.startDate).toLocaleDateString()
        : null,
      nextBillingDateFormatted: params.nextBillingDate
        ? new Date(params.nextBillingDate).toLocaleDateString()
        : null,
    };

    const html = template(data);
    return this.sendEmail({
      to: userEmail,
      subject: `Your ${this.emailConfig.templates.appName} subscription is now active`,
      html,
    });
  }

  async sendContactFormEmail(contactData: {
    name: string;
    email: string;
    message: string;
  }): Promise<boolean> {
    const template = this.loadTemplate('contact-form');
    const data = {
      name: contactData.name,
      email: contactData.email,
      message: contactData.message,
      appName: this.emailConfig.templates.appName,
      appUrl: this.emailConfig.templates.appUrl,
      timestamp: new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
    };

    const html = template(data);
    return this.sendEmail({
      to: this.emailConfig.adminEmail || 'hello@sunoo.app',
      subject: `New Contact Form Submission from ${contactData.name} - ${this.emailConfig.templates.appName}`,
      html,
    });
  }

  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    const templatePath = path.join(
      process.cwd(),
      'dist',
      'email',
      'templates',
      `${templateName}.hbs`
    );

    try {
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      return handlebars.compile(templateSource);
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }
}
