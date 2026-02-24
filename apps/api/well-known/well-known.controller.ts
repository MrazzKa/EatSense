import { Controller, Get, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as nodemailer from 'nodemailer';

@ApiTags('Well-Known')
@Controller('.well-known')
export class WellKnownController {
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('email')
  @ApiOperation({ summary: 'Email/SMTP health check' })
  @ApiResponse({ status: 200, description: 'SMTP connection verified' })
  @ApiResponse({ status: 503, description: 'SMTP connection failed' })
  async checkEmail() {
    const mailProvider = (process.env.MAIL_PROVIDER || '').toLowerCase();
    
    if (mailProvider === 'smtp' || (!mailProvider && process.env.SMTP_HOST)) {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
      const smtpSecure = (process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpHost || !smtpUser || !smtpPass) {
        throw new HttpException(
          {
            status: 'error',
            message: 'SMTP configuration incomplete (need SMTP_HOST, SMTP_USER, SMTP_PASS)',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        // Verify SMTP connection (throws error if connection/certificates are invalid)
        await transporter.verify();

        return {
          status: 'ok',
          provider: 'SMTP',
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          user: smtpUser,
          message: 'SMTP connection verified successfully',
        };
      } catch (error: any) {
        throw new HttpException(
          {
            status: 'error',
            provider: 'SMTP',
            host: smtpHost,
            port: smtpPort,
            message: error.message || 'SMTP verification failed',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    } else if (mailProvider === 'sendgrid') {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        throw new HttpException(
          {
            status: 'error',
            message: 'SendGrid API key not configured',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return {
        status: 'ok',
        provider: 'SendGrid',
        message: 'SendGrid API key configured (connection not verified)',
      };
    } else {
      throw new HttpException(
        {
          status: 'error',
          message: 'No mail provider configured',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('security.txt')
  @ApiOperation({ summary: 'Security information' })
  @ApiResponse({ status: 200, description: 'Security information retrieved' })
  getSecurity() {
    return {
      contact: 'security@eatsense.ch',
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      encryption: 'https://eatsense.app/pgp-key.txt',
      acknowledgments: 'https://eatsense.app/security',
    };
  }

  @Get('apple-app-site-association')
  @ApiOperation({ summary: 'iOS Universal Links configuration' })
  getAppleAppSiteAssociation(@Res() res: Response) {
    const association = {
      applinks: {
        apps: [] as any[],
        details: [
          {
            appID: '73T7PB4F99.ch.eatsense.app',
            paths: ['/v1/auth/magic/consume*'],
          },
        ],
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.json(association);
  }

  @Get('assetlinks.json')
  @ApiOperation({ summary: 'Android App Links configuration' })
  getAssetLinks(@Res() res: Response) {
    const assetLinks = [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'ch.eatsense.app',
          sha256_cert_fingerprints: [] as string[],
        },
      },
    ];

    res.setHeader('Content-Type', 'application/json');
    res.json(assetLinks);
  }
}
