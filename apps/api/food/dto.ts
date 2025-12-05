import { IsString, IsNotEmpty, MinLength, IsOptional, IsIn, IsArray, IsNumber, ValidateNested } from 'class-validator';
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
