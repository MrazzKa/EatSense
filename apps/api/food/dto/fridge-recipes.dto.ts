import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, ArrayMaxSize } from 'class-validator';

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
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  excludeTitles?: string[];
}
