import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/mail';
import { createTransport, Transporter } from 'nodemailer';

type MailProvider = 'sendgrid' | 'smtp' | 'none';

// Categories let each send-site pick a sender address. On infomaniak the
// recommended setup is a single mailbox (`info@eatsense.ch`) with free
// aliases (`pharmacy@`, `experts@`, `noreply@`) routed to it. Env vars are
// optional — all fall back to the default MAIL_FROM if unset.
export type MailCategory = 'default' | 'pharmacy' | 'expert' | 'noreply' | 'otp';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly fromAddress: string;
  private readonly mailDisabled: boolean;
  private readonly ignoreErrors: boolean;
  private readonly provider: MailProvider;
  private readonly smtpTransporter?: Transporter;
  private readonly categoryFrom: Record<MailCategory, string>;

  constructor() {
    const configuredFrom = (process.env.MAIL_FROM || '').trim();
    this.fromAddress = configuredFrom || 'EatSense <info@eatsense.ch>';
    this.categoryFrom = {
      default: this.fromAddress,
      pharmacy: (process.env.MAIL_FROM_PHARMACY || '').trim() || this.fromAddress,
      expert: (process.env.MAIL_FROM_EXPERT || '').trim() || this.fromAddress,
      noreply: (process.env.MAIL_FROM_NOREPLY || '').trim() || this.fromAddress,
      otp: (process.env.MAIL_FROM_OTP || '').trim() || (process.env.MAIL_FROM_NOREPLY || '').trim() || this.fromAddress,
    };
    this.mailDisabled = (process.env.MAIL_DISABLE || 'false').toLowerCase() === 'true';
    this.ignoreErrors = (process.env.AUTH_DEV_IGNORE_MAIL_ERRORS || 'false').toLowerCase() === 'true';

    const requestedProvider = (process.env.MAIL_PROVIDER || '').toLowerCase();

    if (requestedProvider === 'smtp' || (!requestedProvider && process.env.SMTP_HOST)) {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
      const smtpSecure = (process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpUser && smtpPass) {
        this.smtpTransporter = createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        this.provider = 'smtp';
        this.logger.log(`[Mailer] SMTP configured (host=${smtpHost}:${smtpPort}, secure=${smtpSecure})`);
      } else {
        this.provider = 'none';
        this.logger.warn('[Mailer] SMTP configuration incomplete (need SMTP_HOST, SMTP_USER, SMTP_PASS). Emails disabled.');
      }
    } else {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (apiKey) {
        sgMail.setApiKey(apiKey);
        this.provider = 'sendgrid';
        this.logger.log('[Mailer] SendGrid configured');
      } else if (requestedProvider === 'sendgrid') {
        this.provider = 'none';
        this.logger.warn('[Mailer] SENDGRID_API_KEY missing. Emails disabled.');
      } else {
        this.provider = 'none';
        this.logger.warn('[Mailer] No mail provider configured. Emails disabled.');
      }
    }
  }

  /**
   * Resolve the sender address for a category. Used by call-sites that don't
   * pass an explicit `from` (e.g. pharmacy emails should come from pharmacy@).
   */
  fromFor(category: MailCategory): string {
    return this.categoryFrom[category] || this.fromAddress;
  }

  async sendOtpEmail(to: string, otp: string) {
    const subject = `Your EatSense code: ${otp}`;
    const text = [
      'Hi!',
      '',
      `Your one-time sign-in code is ${otp}.`,
      'This code expires in 10 minutes.',
      '',
      'If you did not request this code, you can safely ignore this email.',
    ].join('\n');

    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 520px; margin: 0 auto;">
        <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Hi!</p>
        <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Your one-time sign-in code is:</p>
        <p style="margin: 0 0 24px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563EB; text-align: center;">${otp}</p>
        <p style="margin: 0 0 12px; color: #374151; font-size: 14px;">This code expires in 10 minutes.</p>
        <p style="margin: 0; color: #6B7280; font-size: 14px;">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `;

    await this.dispatchMail('otp', { to, from: this.fromFor('otp'), subject, text, html });
  }

  async sendMagicLinkEmail(to: string, magicLinkUrl: string) {
    const subject = 'Your EatSense magic link';
    const text = [
      'Hi!',
      '',
      'Use the link below to sign in to EatSense:',
      magicLinkUrl,
      '',
      'This link expires in 15 minutes. If you did not request it, you can ignore this email.',
    ].join('\n');

    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 520px; margin: 0 auto;">
        <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Hi!</p>
        <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Tap the button below to sign in to EatSense:</p>
        <p style="margin: 0 0 24px; text-align: center;">
          <a href="${magicLinkUrl}" style="background-color: #2563EB; color: #FFFFFF; padding: 14px 28px; border-radius: 12px; font-weight: 600; text-decoration: none; display: inline-block;">Sign in</a>
        </p>
        <p style="margin: 0 0 12px; color: #374151; font-size: 14px;">Or paste this link into your browser:</p>
        <p style="margin: 0 0 24px; color: #2563EB; font-size: 13px; word-break: break-all;">${magicLinkUrl}</p>
        <p style="margin: 0; color: #6B7280; font-size: 14px;">This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>
      </div>
    `;

    await this.dispatchMail('magic-link', { to, from: this.fromFor('otp'), subject, text, html });
  }

  /**
   * Welcome email for a freshly-created expert: portal URL + login credentials.
   * The temp password must be changed on first login (enforced server-side).
   */
  async sendExpertWelcomeEmail(to: string, params: { portalUrl: string; tempPassword: string }) {
    const { portalUrl, tempPassword } = params;
    const subject = 'Welcome to EatSense Expert — your portal access';
    const text = [
      'Welcome to EatSense Expert!',
      '',
      'Your expert account is ready. Sign in to the portal here:',
      portalUrl,
      '',
      `Email: ${to}`,
      `Temporary password: ${tempPassword}`,
      '',
      'For security, you will be asked to set a new password the first time you sign in.',
    ].join('\n');

    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 520px; margin: 0 auto;">
        <p style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 700;">Welcome to EatSense Expert!</p>
        <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">Your expert account is ready. Use the credentials below to sign in to your portal:</p>
        <div style="margin: 0 0 24px; padding: 16px 20px; background: #F3F4F6; border-radius: 12px;">
          <p style="margin: 0 0 8px; color: #374151; font-size: 14px;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Temporary password:</strong> <span style="font-family: monospace; font-size: 15px; color: #111827;">${tempPassword}</span></p>
        </div>
        <p style="margin: 0 0 24px; text-align: center;">
          <a href="${portalUrl}" style="background-color: #2563EB; color: #FFFFFF; padding: 14px 28px; border-radius: 12px; font-weight: 600; text-decoration: none; display: inline-block;">Open the portal</a>
        </p>
        <p style="margin: 0; color: #6B7280; font-size: 14px;">For security, you will be asked to set a new password the first time you sign in.</p>
      </div>
    `;

    await this.dispatchMail('expert-welcome', { to, from: this.fromFor('expert'), subject, text, html });
  }

  /**
   * Send generic email. Pass `category` so the message goes out from the
   * matching alias (e.g. pharmacy emails from `pharmacy@eatsense.ch`).
   * Defaults to the generic `info@` address for back-compat with existing
   * call-sites that don't specify a category.
   */
  async sendEmail(options: { to: string | string[]; subject: string; text: string; html?: string; category?: MailCategory }) {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const html = options.html || options.text.replace(/\n/g, '<br>');

    await this.dispatchMail('notification', {
      to: recipients,
      from: this.fromFor(options.category || 'default'),
      subject: options.subject,
      text: options.text,
      html,
    });
  }

  private async dispatchMail(type: 'otp' | 'magic-link' | 'notification' | 'expert-welcome', message: MailDataRequired) {
    if (this.mailDisabled) {
      this.logger.warn(`[Mailer] Mail disabled (MAIL_DISABLE=true). Skipping ${type} email.`);
      return;
    }

    const recipients = this.normalizeRecipients(message.to);
    if (recipients.length === 0) {
      const warning = `[Mailer] No recipients provided for ${type} email.`;
      if (this.ignoreErrors) {
        this.logger.warn(warning);
        return;
      }
      throw new Error(warning);
    }

    const from = this.resolveFromValue(message.from);

    if (this.provider === 'sendgrid') {
      try {
        await sgMail.send({
          ...message,
          from,
          to: recipients.length === 1 ? recipients[0] : recipients,
        } as MailDataRequired);
        this.logger.log(`[Mailer] ${type} email dispatched via SendGrid to ${this.maskEmail(recipients[0])}`);
      } catch (error: any) {
        const errorMessage = error?.response?.body || error?.message || 'Unknown error';
        this.logger.error(`[Mailer] Failed to send ${type} email via SendGrid to ${this.maskEmail(recipients[0])}:`, errorMessage);
        if (this.ignoreErrors) {
          this.logger.warn('[Mailer] Ignoring mail send error due to AUTH_DEV_IGNORE_MAIL_ERRORS=true');
          return;
        }
        throw error;
      }
      return;
    }

    if (this.provider === 'smtp' && this.smtpTransporter) {
      try {
        await this.smtpTransporter.sendMail({
          to: recipients.join(', '),
          from,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });
        this.logger.log(`[Mailer] ${type} email dispatched via SMTP to ${this.maskEmail(recipients[0])}`);
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        this.logger.error(`[Mailer] Failed to send ${type} email via SMTP to ${this.maskEmail(recipients[0])}:`, errorMessage);
        if (this.ignoreErrors) {
          this.logger.warn('[Mailer] Ignoring mail send error due to AUTH_DEV_IGNORE_MAIL_ERRORS=true');
          return;
        }
        throw error;
      }
      return;
    }

    const warning = `[Mailer] No mail provider configured. ${type} email skipped.`;
    if (this.ignoreErrors) {
      this.logger.warn(warning);
      return;
    }
    throw new Error(warning);
  }

  private resolveFromValue(fromValue: MailDataRequired['from'] | undefined): string {
    if (!fromValue) {
      return this.fromAddress;
    }

    if (typeof fromValue === 'string') {
      return fromValue;
    }

    const fromObject: any = fromValue;
    const email: string | undefined = fromObject?.email || fromObject?.address;
    const name: string | undefined = fromObject?.name;

    if (email && name) {
      return `${name} <${email}>`;
    }

    if (email) {
      return email;
    }

    return this.fromAddress;
  }

  private normalizeRecipients(toValue: MailDataRequired['to']): string[] {
    const entries = Array.isArray(toValue) ? toValue : [toValue];
    return entries
      .map((entry: any) => {
        if (!entry) {
          return null;
        }
        if (typeof entry === 'string') {
          return entry;
        }
        if (typeof entry.email === 'string') {
          return entry.email;
        }
        if (typeof entry.address === 'string') {
          return entry.address;
        }
        return null;
      })
      .filter((value): value is string => !!value);
  }

  private maskEmail(email: string) {
    if (!email) {
      return '[unknown]';
    }
    const [local, domain] = email.split('@');
    if (!domain) {
      return `${email.slice(0, 3)}***`;
    }
    const visibleLocal = local.slice(0, Math.min(2, local.length));
    return `${visibleLocal}***@${domain}`;
  }
}
