import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  cid: string;
}

@Injectable()
export class MailingService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: Number(this.config.get('SMTP_PORT') || 587),
      secure: Number(this.config.get('SMTP_PORT')) === 465,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async sendMail(
    to: string,
    subject: string,
    html: string,
    options?: { from?: string; attachments?: MailAttachment[] },
  ) {
    try {
      await this.transporter.sendMail({
        from: options?.from || this.config.get('SMTP_FROM') || '"SellaPlus" <noreply@sellaplus.com>',
        to,
        subject,
        html,
        attachments: options?.attachments,
      });
    } catch (error) {
      console.error('Mailing error:', error);
      throw new InternalServerErrorException('Error al enviar correo electrónico');
    }
  }
}
