import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMedicationDto {
  @ApiProperty({ example: 'Aspirin', description: 'Medication name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '1 tablet', description: 'Dosage' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiProperty({ 
    example: 'daily', 
    description: 'Frequency: daily, twice_daily, weekly, custom',
    enum: ['daily', 'twice_daily', 'three_times_daily', 'weekly', 'custom'],
  })
  @IsString()
  frequency!: string;

  @ApiProperty({ 
    example: ['08:00', '20:00'], 
    description: 'Array of time strings in HH:mm format',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  times!: string[];

  @ApiPropertyOptional({ 
    example: [1, 3, 5], 
    description: 'Days of week (0-6, Sunday-Saturday). Null means every day',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z', description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z', description: 'End date (optional)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Take with food', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true, description: 'Enable reminders', default: true })
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;
}

