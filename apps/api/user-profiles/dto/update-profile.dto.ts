import { IsOptional, IsString, IsNumber, IsInt, IsObject, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating user profile
 * Only includes fields that exist in UserProfile Prisma model
 * Note: email is NOT included - it's in User model, not UserProfile
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  age?: number;

  @ApiPropertyOptional({ example: 175.5 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 70.0 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'moderately_active' })
  @IsOptional()
  @IsString()
  activityLevel?: string;

  @ApiPropertyOptional({ example: 'maintain_weight' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: 75.0 })
  @IsOptional()
  @IsNumber()
  targetWeight?: number;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsInt()
  dailyCalories?: number;

  @ApiPropertyOptional({ description: 'User preferences as JSON object' })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Health profile as JSON object' })
  @IsOptional()
  @IsObject()
  healthProfile?: Record<string, any>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOnboardingCompleted?: boolean;
}

