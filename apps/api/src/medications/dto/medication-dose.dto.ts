import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MedicationDoseDto {
  @ApiProperty({ example: '08:00', description: 'Time of day in HH:mm format' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'timeOfDay must be in HH:mm format',
  })
  timeOfDay: string; // "08:00", "13:30" и т.п.

  @ApiPropertyOptional({ example: false, description: 'Take before meal' })
  @IsOptional()
  @IsBoolean()
  beforeMeal?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Take after meal' })
  @IsOptional()
  @IsBoolean()
  afterMeal?: boolean;
}

