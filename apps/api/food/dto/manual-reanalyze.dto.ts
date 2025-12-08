import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManualAnalyzedItemDto {
  @ApiProperty({ required: false, description: 'Stable identifier for the ingredient' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Grilled Chicken Breast', description: 'Item name' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 150, description: 'Portion in grams' })
  @IsNumber()
  @Min(0)
  portion_g!: number;

  @ApiProperty({ required: false, example: 165, description: 'Calories (optional, will be recalculated if not provided)' })
  @IsOptional()
  @IsNumber()
  calories?: number;

  @ApiProperty({ required: false, example: 31, description: 'Protein in grams (optional)' })
  @IsOptional()
  @IsNumber()
  protein_g?: number;

  @ApiProperty({ required: false, example: 0, description: 'Carbs in grams (optional)' })
  @IsOptional()
  @IsNumber()
  carbs_g?: number;

  @ApiProperty({ required: false, example: 3.6, description: 'Fat in grams (optional)' })
  @IsOptional()
  @IsNumber()
  fat_g?: number;
}

export class ManualReanalyzeDto {
  @ApiProperty({ type: [ManualAnalyzedItemDto], description: 'List of manually edited items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualAnalyzedItemDto)
  items!: ManualAnalyzedItemDto[];
}

