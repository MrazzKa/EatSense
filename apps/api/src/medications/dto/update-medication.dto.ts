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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MedicationDoseDto } from './medication-dose.dto';

export class UpdateMedicationDto {
  @ApiPropertyOptional({ example: 'Metformin', description: 'Medication name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '500 mg', description: 'Dosage' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ example: 'Before dinner, with water', description: 'Instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'Start date (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z', description: 'End date (optional, ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Asia/Almaty', description: 'IANA timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: true, description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Total quantity of tablets/pills in package' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 30, description: 'Remaining stock (will be recalculated if quantity or doses change)' })
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

  @ApiPropertyOptional({
    example: [{ timeOfDay: '08:00', beforeMeal: false, afterMeal: false }],
    description: 'Array of dose times',
    type: [MedicationDoseDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDoseDto)
  doses?: MedicationDoseDto[];
}
