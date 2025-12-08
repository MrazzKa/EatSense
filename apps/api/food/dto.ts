import { IsString, IsNotEmpty, MinLength, IsOptional, IsIn, IsArray, IsNumber, ValidateNested, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AnalyzeImageDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  image: any;

  @ApiProperty({
    required: false,
    enum: ['en', 'ru', 'kk'],
    description: 'Preferred locale for analysis and localized names',
  })
  @IsOptional()
  @IsIn(['en', 'ru', 'kk'])
  locale?: 'en' | 'ru' | 'kk';
}

export class AnalyzeTextDto {
  @ApiProperty({ example: 'Grilled chicken breast with rice and vegetables' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  description!: string;

  @ApiProperty({
    required: false,
    enum: ['en', 'ru', 'kk'],
    description: 'Preferred locale for analysis and localized names',
  })
  @IsOptional()
  @IsIn(['en', 'ru', 'kk'])
  locale?: 'en' | 'ru' | 'kk';
}

export class ReanalyzeItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Grilled Chicken Breast' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  portion_g!: number;

  @ApiProperty({ example: 165 })
  @IsNumber()
  calories!: number;

  @ApiProperty({ example: 31 })
  @IsNumber()
  protein!: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  carbs!: number;

  @ApiProperty({ example: 3.6 })
  @IsNumber()
  fat!: number;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  fiber?: number;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  sugars?: number;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  satFat?: number;
}

export class ReanalyzeDto {
  @ApiProperty({ type: [ReanalyzeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReanalyzeItemDto)
  items!: ReanalyzeItemDto[];
}

export class ManualComponentInputDto {
  @ApiProperty({ description: 'Client-side id or index for mapping to items' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'рыба хе', description: 'New interpretation name (e.g., "рыба хе" instead of "рис")' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 200, description: 'Portion in grams' })
  @IsNumber()
  @Min(1)
  portion_g!: number;
}

export class ManualReanalyzeDto {
  @ApiProperty({ description: 'Analysis ID to reanalyze' })
  @IsString()
  @IsNotEmpty()
  analysisId!: string;

  @ApiProperty({ type: [ManualComponentInputDto], description: 'List of manually edited components' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualComponentInputDto)
  components!: ManualComponentInputDto[];

  @ApiProperty({ required: false, enum: ['en', 'ru', 'kk'] })
  @IsOptional()
  @IsIn(['en', 'ru', 'kk'])
  locale?: 'en' | 'ru' | 'kk';

  @ApiProperty({ required: false, enum: ['US', 'CH', 'EU', 'OTHER'] })
  @IsOptional()
  @IsIn(['US', 'CH', 'EU', 'OTHER'])
  region?: 'US' | 'CH' | 'EU' | 'OTHER';
}

export class ReanalyzeRequestDto {
  @ApiProperty({ required: false, enum: ['default', 'review'], description: 'Vision mode: review = more careful analysis' })
  @IsOptional()
  @IsIn(['default', 'review'])
  mode?: 'default' | 'review';
}
