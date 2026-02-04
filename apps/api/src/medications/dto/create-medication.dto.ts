import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicationDoseDto } from './medication-dose.dto';

export class CreateMedicationDto {
  @ApiProperty({ example: 'Metformin', description: 'Medication name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '500 mg', description: 'Dosage' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ example: 'Before dinner, with water', description: 'Instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Start date (ISO string)' })
  @IsDateString()
  startDate: string; // ISO date string

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z', description: 'End date (optional, ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string; // ISO date string | null

  @ApiPropertyOptional({ example: 'Asia/Almaty', description: 'IANA timezone', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string; // IANA, напр. "Asia/Almaty"

  @ApiPropertyOptional({ example: true, description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Total quantity of tablets/pills in package' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 30, description: 'Remaining stock (will be calculated automatically if not provided)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  remainingStock?: number;

  @ApiPropertyOptional({ example: 7, description: 'Low stock threshold in days', default: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg', description: 'Medication photo URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    example: [{ timeOfDay: '08:00', beforeMeal: false, afterMeal: false }],
    description: 'Array of dose times',
    type: [MedicationDoseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDoseDto)
  doses: MedicationDoseDto[];
}

