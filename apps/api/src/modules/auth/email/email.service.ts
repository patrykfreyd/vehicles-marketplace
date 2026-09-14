/**
 * Transactional email — verification links, password resets — sent over
 * SMTP (plans/07-authentication-authorization.md §11.1: "I'll use some SMTP
 * later", replacing this plan's original Resend recommendation). Prep-only
 * for now: `SMTP_HOST` is blank until a real mailbox/relay exists (setup
 * step — see .env.example and docs/deployment-runbook.md), so this falls
 * back to logging the email instead of sending it. Nothing else in the auth
 * flow needs to change once real SMTP credentials land — only this file's
 * `isConfigured` branch starts taking the other path.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '@vehicles-marketplace/config';

export type EmailEnv = Pick<
  Env,
  'SMTP_HOST' | 'SMTP_PORT' | 'SMTP_USER' | 'SMTP_PASSWORD' | 'SMTP_SECURE' | 'EMAIL_FROM'
>;

@Injectable()
export class EmailService {
  private readonly transporter: Transporter | undefined;
  private readonly from: string;
  private readonly isConfigured: boolean;

  constructor(
    configService: ConfigService<Env, true>,
    private readonly logger: Logger,
  ) {
    const host = configService.get('SMTP_HOST', { infer: true });
    this.from = configService.get('EMAIL_FROM', { infer: true });
    this.isConfigured = host.length > 0;

    if (this.isConfigured) {
      this.transporter = createTransport({
        host,
        port: configService.get('SMTP_PORT', { infer: true }),
        secure: configService.get('SMTP_SECURE', { infer: true }),
        auth: {
          user: configService.get('SMTP_USER', { infer: true }),
          pass: configService.get('SMTP_PASSWORD', { infer: true }),
        },
      });
    }
  }

  async sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Verify your email',
      text: `Welcome! Verify your email within 7 days to keep access to your account: ${verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your password',
      text: `Reset your password: ${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    });
  }

  private async send(message: { to: string; subject: string; text: string }): Promise<void> {
    if (!this.transporter) {
      // Local/Test until real SMTP credentials exist — see this file's
      // top comment. Logging (rather than throwing) keeps registration/
      // password-reset usable end-to-end without a real mailbox.
      this.logger.log(
        { to: message.to, subject: message.subject },
        `[EmailService] SMTP not configured — would have sent: ${message.text}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
