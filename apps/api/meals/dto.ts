import { IsString, IsOptional, IsArray, IsNumber, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMealItemDto {
  @ApiProperty({ example: 'Chicken Breast' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 165 })
  @IsNumber()
  @IsOptional()
  calories?: number;

  @ApiProperty({ example: 31 })
  @IsNumber()
  @IsOptional()
  protein?: number;

  @ApiProperty({ example: 3.6 })
  @IsNumber()
  @IsOptional()
  fat?: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @IsOptional()
  carbs?: number;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @IsOptional()
  weight?: number;
}

export class CreateMealDto {
  @ApiProperty({ example: 'Breakfast' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'BREAKFAST' })
  @IsString()
  type!: string;

  @ApiProperty({ example: '2024-01-01T08:00:00Z' })
  @IsString()
  @IsOptional()
  consumedAt?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsString()
  @IsOptional()
  imageUri?: string;

  @ApiProperty({ example: 'cmoqvtmav0007o80dqbfysmjd', required: false })
  @IsString()
  @IsOptional()
  analysisId?: string;

  @ApiProperty({ 
    example: [
      {
        name: 'Scrambled Eggs',
        calories: 200,
        protein: 12,
        fat: 15,
        carbs: 2,
        weight: 100
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  items!: any[];

  @ApiProperty({
    required: false,
    description: 'Optional health score payload attached to the meal',
    example: {
      score: 82,
      grade: 'B',
      factors: {
        protein: { label: 'Protein', score: 90, weight: 0.25 },
      },
      feedback: ['Add more fiber.'],
    },
  })
  @IsOptional()
  @IsObject()
  healthScore?: Record<string, any>;
}

export class EditMealItemDto {
  @ApiProperty({ example: 'item-1', required: false })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'Chicken Breast' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  portion_g!: number;

  @ApiProperty({ example: 165, required: false })
  @IsNumber()
  @IsOptional()
  calories?: number;

  @ApiProperty({ example: 31, required: false })
  @IsNumber()
  @IsOptional()
  protein_g?: number;

  @ApiProperty({ example: 3.6, required: false })
  @IsNumber()
  @IsOptional()
  fat_g?: number;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  carbs_g?: number;
}

export class EditMealItemsDto {
  @ApiProperty({ type: [EditMealItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EditMealItemDto)
  items!: EditMealItemDto[];

  @ApiProperty({ example: 'en', required: false })
  @IsString()
  @IsOptional()
  locale?: string;
}
