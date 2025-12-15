import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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

    // Process image - Strip EXIF metadata and convert to JPEG
    // Note: Sharp removes EXIF metadata automatically when converting to JPEG format
    // We don't call withMetadata() to ensure no metadata is preserved
    const processedImage = await sharp(file.buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

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
}
