import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

export interface ZeptomailEmailData {
  to: string;
  templateKey: string;
  dynamicFields?: any;
  userName?: string;
  userEmail?: string;
}

@Injectable()
export class ZeptomailService {
  private readonly logger = new Logger(ZeptomailService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.zeptomail.com/v1.1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('email.smtp.auth.pass') || ''; // Using SMTP_PASS as API key
  }

  async sendEmailWithTemplate(emailData: ZeptomailEmailData): Promise<boolean> {
    try {
      const payload = {
        template_key: emailData.templateKey,
        from: {
          address:
            this.configService.get('email.from.email') || 'hello@sunoo.app',
          name: this.configService.get('email.from.name') || 'Sunoo App',
        },
        to: [
          {
            email_address: {
              address: emailData.to,
              name: emailData.userName || emailData.to,
            },
          },
        ],
        merge_info: this.buildMergeInfo(emailData),
      };

      const response = await this.makeApiRequest(
        '/v1.1/email/template',
        payload
      );

      if (response && response.data) {
        this.logger.log(`Zeptomail email sent successfully to ${emailData.to}`);
        return true;
      } else {
        this.logger.error(
          `Failed to send Zeptomail email to ${emailData.to}:`,
          response
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error sending Zeptomail email to ${emailData.to}:`,
        error
      );
      return false;
    }
  }

  private buildMergeInfo(emailData: ZeptomailEmailData): any {
    const mergeInfo: any = {
      username: emailData.userName || emailData.to.split('@')[0], // Use part before @ as name
    };

    // Add dynamic fields based on template
    if (emailData.dynamicFields) {
      Object.keys(emailData.dynamicFields).forEach(key => {
        mergeInfo[key] = emailData.dynamicFields[key];
      });
    }

    return mergeInfo;
  }

  private async makeApiRequest(endpoint: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);

      const options = {
        hostname: 'api.zeptomail.com',
        port: 443,
        path: endpoint,
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          Authorization: `Zoho-enczapikey ${this.apiKey}`,
        },
      };

      const req = https.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', error => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
}
