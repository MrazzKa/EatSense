import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export interface UploadResult {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  storageProvider: 'database' | 's3';
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Bucket?: string;
  private readonly s3Client?: S3Client;
  private readonly s3Enabled: boolean;
  private readonly forcePathStyle: boolean;
  private readonly endpoint?: string;

  constructor(private readonly prisma: PrismaService) {
    this.s3Bucket = process.env.S3_BUCKET || undefined;
    this.endpoint = process.env.S3_ENDPOINT || undefined;
    this.forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase() !== 'false';

    if (this.s3Bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      this.s3Enabled = true;
      this.s3Client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: this.endpoint,
        forcePathStyle: this.forcePathStyle,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
      });
      this.logger.log(`S3 storage enabled for bucket ${this.s3Bucket}`);
    } else {
      this.s3Enabled = false;
      if (this.s3Bucket) {
        this.logger.warn('S3 bucket configured but credentials missing. Falling back to database storage.');
      }
    }
  }

  async uploadFile(file: any, userId: string): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Process image - convert to JPEG and downscale for storage/analysis
    // Note: Sharp does not preserve EXIF metadata when converting to JPEG by default
    // Handle HEIF/HEIC and other formats that Sharp might not support directly
    let processedImage: Buffer;
    try {
      processedImage = await sharp(file.buffer, {
        // Force format conversion for unsupported formats like HEIF
        failOnError: false,
      })
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
    } catch (sharpError: any) {
      this.logger.error(`[MediaService] Image processing failed: ${sharpError.message}`);

      // If Sharp fails (e.g., HEIF format), try to convert using different approach
      if (sharpError.message?.includes('heif') || sharpError.message?.includes('HEIF') ||
        file.mimetype?.includes('heif') || file.mimetype?.includes('heic')) {
        throw new BadRequestException(
          'HEIF/HEIC format is not supported. Please convert the image to JPEG or PNG before uploading.'
        );
      }

      // For other errors, re-throw with more context
      throw new BadRequestException(
        `Image processing failed: ${sharpError.message || 'Unknown error'}. Please try a different image format.`
      );
    }

    if (this.s3Enabled && this.s3Client && this.s3Bucket) {
      try {
        const key = this.buildObjectKey(userId, file.originalname);
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.s3Bucket,
            Key: key,
            Body: processedImage,
            ContentType: 'image/jpeg',
            Metadata: {
              originalname: file.originalname,
              uploadedBy: userId,
            },
          }),
        );

        const media = await this.prisma.media.create({
          data: {
            userId,
            filename: file.originalname,
            mimetype: file.mimetype,
            size: processedImage.length,
            storageKey: key,
            storageBucket: this.s3Bucket,
            storageProvider: 's3',
          },
        });

        return {
          id: media.id,
          filename: media.filename,
          mimetype: media.mimetype,
          size: media.size,
          url: this.buildPublicUrl(key),
          storageProvider: 's3',
        };
      } catch (error) {
        this.logger.error(`S3 upload failed, falling back to database storage: ${(error as Error).message}`);
      }
    }

    const media = await this.prisma.media.create({
      data: {
        userId,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: processedImage.length,
        data: new Uint8Array(processedImage),
        storageProvider: 'database',
      },
    });

    return {
      id: media.id,
      filename: media.filename,
      mimetype: media.mimetype,
      size: media.size,
      url: `/media/${media.id}`,
      storageProvider: 'database',
    };
  }

  private buildObjectKey(userId: string, originalName: string): string {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '-');
    return `media/${userId}/${Date.now()}-${randomUUID()}-${safeName}`;
  }

  private buildPublicUrl(key: string): string {
    if (!this.endpoint) {
      // Assume AWS style
      return `https://${this.s3Bucket}.s3.amazonaws.com/${key}`;
    }

    try {
      const url = new URL(this.endpoint);
      if (this.forcePathStyle) {
        const base = this.endpoint.endsWith('/') ? this.endpoint.slice(0, -1) : this.endpoint;
        return `${base}/${this.s3Bucket}/${key}`;
      }
      return `${url.protocol}//${this.s3Bucket}.${url.host}/${key}`;
    } catch (error) {
      this.logger.warn(`Invalid S3 endpoint provided, defaulting to path-style: ${this.endpoint}`);
      const base = this.endpoint.endsWith('/') ? this.endpoint.slice(0, -1) : this.endpoint;
      return `${base}/${this.s3Bucket}/${key}`;
    }
  }

  /**
   * Convert relative media path to absolute public URL
   * Used for OpenAI Vision API which requires absolute URLs
   */
  makePublicUrl(relativePath: string): string {
    const baseUrl = process.env.API_BASE_URL || process.env.API_PUBLIC_URL || 'http://localhost:3000';

    let normalized = relativePath;
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    return `${baseUrl}${normalized}`;
  }

  /**
   * Serve media file by ID
   * Redirects to S3 URL for S3-stored files, or streams from database
   */
  async serveMedia(id: string, res: import('express').Response): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.storageProvider === 's3' && media.storageKey) {
      // Redirect to S3 URL
      const url = this.buildPublicUrl(media.storageKey);
      res.redirect(url);
      return;
    }

    if (media.data) {
      // Serve from database
      res.set('Content-Type', 'image/jpeg'); // All images are converted to JPEG on upload
      res.set('Content-Length', media.size.toString());
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      res.send(Buffer.from(media.data));
      return;
    }

    throw new NotFoundException('Media content not available');
  }

  /**
   * Get media as base64 data URL for use with OpenAI Vision API
   */
  async getMediaAsBase64(id: string): Promise<{ dataUrl: string; mimeType: string } | null> {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      return null;
    }

    // Get data from S3 or database
    let data: Buffer | null = null;

    if (media.storageProvider === 's3' && media.storageKey && this.s3Client) {
      try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const command = new GetObjectCommand({
          Bucket: this.s3Bucket,
          Key: media.storageKey,
        });
        const response = await this.s3Client.send(command);
        if (response.Body) {
          const chunks: Uint8Array[] = [];
          const stream = response.Body as AsyncIterable<Uint8Array>;
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          data = Buffer.concat(chunks);
        }
      } catch (error: any) {
        this.logger.error(`[MediaService] Failed to fetch from S3: ${error.message}`);
        return null;
      }
    } else if (media.data) {
      data = Buffer.from(media.data);
    }

    if (!data) {
      return null;
    }

    const mimeType = media.mimetype || 'image/jpeg';
    const base64 = data.toString('base64');
    return {
      dataUrl: `data:${mimeType};base64,${base64}`,
      mimeType,
    };
  }
}
