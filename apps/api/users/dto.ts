import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { HealthProfileDto } from './health-profile.dto';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 25, required: false })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiProperty({ example: 70.5, required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ example: 175, required: false })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiProperty({ example: 'male', required: false, enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @ApiProperty({ example: 'moderately_active', required: false, enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'] })
  @IsOptional()
  @IsEnum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'])
  activityLevel?: string;

  @ApiProperty({ example: 'lose_weight', required: false, enum: ['lose_weight', 'maintain_weight', 'gain_weight'] })
  @IsOptional()
  @IsEnum(['lose_weight', 'maintain_weight', 'gain_weight'])
  goal?: string;

  @ApiProperty({ example: 65, required: false })
  @IsOptional()
  @IsNumber()
  targetWeight?: number;

  @ApiProperty({ example: 2000, required: false })
  @IsOptional()
  @IsNumber()
  dailyCalories?: number;

  @ApiProperty({ example: { dietaryPreferences: ['vegetarian'], allergies: ['nuts'] }, required: false })
  @IsOptional()
  @IsObject()
  preferences?: any;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isOnboardingCompleted?: boolean;

  @ApiProperty({ required: false, type: HealthProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HealthProfileDto)
  healthProfile?: HealthProfileDto;
}
