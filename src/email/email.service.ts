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
    this.transporter.verify((error, success) => {
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
    const template = await this.loadTemplate('welcome');
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
    const template = await this.loadTemplate('verification');
    const data = {
      userName,
      userEmail,
      appName: this.emailConfig.templates.appName,
      appUrl: this.emailConfig.templates.appUrl,
      verificationUrl: `${this.emailConfig.templates.baseUrl}/api/auth/verify-email?token=${verificationToken}`,
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
    const template = await this.loadTemplate('password-reset');
    const data = {
      userName,
      userEmail,
      appName: this.emailConfig.templates.appName,
      appUrl: this.emailConfig.templates.appUrl,
      resetUrl: `${this.emailConfig.templates.baseUrl}/api/auth/reset-password?token=${resetToken}`,
    };

    const html = template(data);
    return this.sendEmail({
      to: userEmail,
      subject: `Reset your ${this.emailConfig.templates.appName} password`,
      html,
    });
  }

  private async loadTemplate(
    templateName: string
  ): Promise<HandlebarsTemplateDelegate> {
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
