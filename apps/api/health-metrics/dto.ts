import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Upper bounds are sanity caps, not medical limits — they reject garbage. */
export class HealthDailyMetricDto {
  @ApiProperty({ example: '2026-07-30', description: 'Local calendar day (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ example: 8500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200000)
  steps?: number;

  @ApiPropertyOptional({ example: 480, description: 'kcal burned through movement' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20000)
  activeEnergyKcal?: number;

  @ApiPropertyOptional({ example: 1600, description: 'kcal burned at rest, as measured by the device' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20000)
  restingEnergyKcal?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  workoutMinutes?: number;

  @ApiPropertyOptional({ example: 430 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  sleepMinutes?: number;

  @ApiPropertyOptional({ example: 58 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(250)
  restingHeartRate?: number;
}

export class SyncHealthMetricsDto {
  @ApiProperty({ enum: ['apple-health', 'health-connect'] })
  @IsIn(['apple-health', 'health-connect'])
  source!: 'apple-health' | 'health-connect';

  @ApiProperty({ type: [HealthDailyMetricDto] })
  @IsArray()
  @ArrayMaxSize(90)
  @ValidateNested({ each: true })
  @Type(() => HealthDailyMetricDto)
  days!: HealthDailyMetricDto[];

  @ApiPropertyOptional({ example: 72.4, description: 'Latest body weight in kg, if the user shared it' })
  @IsOptional()
  @Min(20)
  @Max(500)
  weightKg?: number;

  @ApiPropertyOptional({ example: '2026-07-29T07:12:00.000Z' })
  @IsOptional()
  @IsString()
  weightAt?: string;
}
