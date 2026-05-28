import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const LOCALES = ['en', 'ru', 'kk', 'fr', 'de', 'es'] as const;

export class RegisterPushTokenDto {
  @ApiProperty({
    description: 'Expo push token returned by Expo Notifications API',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Unique identifier for the device registering the token',
    required: false,
    example: 'pixel-7-pro',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: 'Platform or OS of the device (e.g., ios, android)',
    required: false,
    example: 'android',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({
    description: 'Application version reported by the client',
    required: false,
    example: '1.0.0',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiProperty({
    description: 'Whether the token should be marked as enabled for delivery',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: 'Current app locale for localized server push fallback',
    required: false,
    example: 'ru',
  })
  @IsOptional()
  @IsIn(LOCALES as unknown as string[])
  locale?: string;

  @ApiProperty({
    description: 'Current device timezone',
    required: false,
    example: 'Europe/Zurich',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

