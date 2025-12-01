import { IsString, IsNotEmpty, IsOptional, MinLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GeneralQuestionDto {
  @ApiProperty({ example: 'user-id-123' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'What should I eat for breakfast?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  question!: string;

  @ApiProperty({ example: 'en', required: false })
  @IsString()
  @IsOptional()
  language?: string;
}

export class LabResultsDto {
  @ApiProperty({ example: 'user-id-123' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'WBC: 7.5, RBC: 4.5, Glucose: 95' })
  @IsString()
  @IsOptional()
  rawText?: string;

  @ApiProperty({ example: 'en', required: false })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ 
    example: 'cbc',
    enum: ['cbc', 'biochemistry', 'lipid', 'glycemic', 'vitamins', 'hormonal', 'inflammation', 'other'],
    required: false 
  })
  @IsString()
  @IsOptional()
  @IsIn(['cbc', 'biochemistry', 'lipid', 'glycemic', 'vitamins', 'hormonal', 'inflammation', 'other'])
  labType?: string;
}

export class NutritionAdviceDto {
  @ApiProperty({ example: 'user-id-123' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'How can I improve my protein intake?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  question!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  context?: any;

  @ApiProperty({ example: 'en', required: false })
  @IsString()
  @IsOptional()
  language?: string;
}


