import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';

/** Only the most recent titles matter for "more recipes"; older ones are dropped. */
export const MAX_EXCLUDE_TITLES = 20;

/**
 * Clients send every title shown so far, which can exceed the limit. Keep the
 * last MAX_EXCLUDE_TITLES string entries instead of rejecting the request.
 */
export function normalizeExcludeTitles(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim().slice(0, 200))
    .slice(-MAX_EXCLUDE_TITLES);
}

const LOCALES = ['en', 'ru', 'kk', 'fr', 'de', 'es'] as const;

export class FridgeRecipesDto {
  @ApiProperty({ type: [String], description: 'Ingredients the user has on hand' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  ingredients!: string[];

  @ApiProperty({ required: false, enum: LOCALES })
  @IsOptional()
  @IsIn(LOCALES as unknown as string[])
  locale?: (typeof LOCALES)[number];

  @ApiProperty({
    required: false,
    description: 'Scan these ingredients came from. Links the recipes to the history entry and records the user\'s edits to the detected list.',
  })
  @IsOptional()
  @IsString()
  scanId?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Titles already suggested — ask for a different set ("more recipes").',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeExcludeTitles(value))
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_EXCLUDE_TITLES)
  excludeTitles?: string[];
}
