import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MAX_NOTE_LENGTH,
  MAX_ZONES_PER_REPORT,
  SEVERITY_MAX,
  SEVERITY_MIN,
} from './symptom-catalog';

/**
 * Shape-level validation only. Whether `zoneId` exists and whether the answers
 * are legal values for that zone is a catalogue question, so the service asks
 * the catalogue — class-validator has no way to express "valid for this zone".
 */
export class SymptomEntryDto {
  @ApiProperty({ example: 'abdomen_epigastrium' })
  @IsString()
  @MaxLength(64)
  zoneId!: string;

  @ApiProperty({ example: 6, minimum: SEVERITY_MIN, maximum: SEVERITY_MAX })
  @IsInt()
  @Min(SEVERITY_MIN)
  @Max(SEVERITY_MAX)
  severity!: number;

  @ApiPropertyOptional({
    example: { onset: 'days', frequency: 'daily', character: 'burning', related_food: 'yes' },
    description: 'Answers keyed by question id. Values are catalogue ids, never free text.',
  })
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;
}

export class CreateSymptomReportDto {
  @ApiProperty({ type: [SymptomEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ZONES_PER_REPORT)
  @ValidateNested({ each: true })
  @Type(() => SymptomEntryDto)
  entries!: SymptomEntryDto[];

  @ApiPropertyOptional({
    example: ['chest_pain_radiating'],
    description: 'Emergency checklist items the user ticked. Unknown ids are ignored.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  redFlags?: string[];

  @ApiPropertyOptional({ example: 'Началось после обеда, второй день подряд' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NOTE_LENGTH)
  note?: string;

  @ApiPropertyOptional({
    example: '2026-09-20T12:30:00.000Z',
    description: 'When the symptoms happened. Defaults to now; must not be in the future.',
  })
  @IsOptional()
  @IsString()
  reportedAt?: string;

  @ApiPropertyOptional({ example: 'ru' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;
}
