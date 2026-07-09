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
}
