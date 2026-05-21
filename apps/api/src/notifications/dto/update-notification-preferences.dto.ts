import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

const HEALTH_ISSUES = ['sleep', 'stress', 'energy', 'digestion'] as const;

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Whether daily push reminders are enabled', default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  dailyPushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Hour of day (0-23) to send reminders in local timezone', default: 8 })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  dailyPushHour?: number;

  @ApiPropertyOptional({ description: 'Minute of hour (0-59) to send reminders', default: 0 })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  dailyPushMinute?: number;

  @ApiPropertyOptional({ description: 'IANA timezone identifier', default: 'UTC', example: 'Europe/Berlin' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  timezone?: string;

  // ===== Smart tips (opt-in personalised reminders) =====

  @ApiPropertyOptional({ description: 'Enable smart tips notifications', default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  smartTipsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Hour of day (0-23) for smart tips, in user timezone', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  smartTipsHour?: number;

  @ApiPropertyOptional({ description: 'Health issues for personalised tips', example: ['sleep', 'stress'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsIn(HEALTH_ISSUES as unknown as string[], { each: true })
  healthIssues?: string[];
}

