import {
  IsOptional,
  ValidateNested,
  IsNumber,
  IsIn,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MetabolicDto {
  @ApiProperty({ example: 21, required: false, minimum: 5, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  bodyFatPercent?: number;

  @ApiProperty({ example: 87, required: false, minimum: 50, maximum: 150 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(150)
  waistCm?: number;

  @ApiProperty({ example: 101, required: false, minimum: 70, maximum: 160 })
  @IsOptional()
  @IsNumber()
  @Min(70)
  @Max(160)
  hipCm?: number;

  @ApiProperty({ example: 0.86, required: false, minimum: 0.2, maximum: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.2)
  @Max(2.0)
  whr?: number;

  @ApiProperty({
    example: 'visceral',
    required: false,
    enum: ['visceral', 'gynoid', 'mixed'],
  })
  @IsOptional()
  @IsIn(['visceral', 'gynoid', 'mixed'])
  fatDistributionType?: 'visceral' | 'gynoid' | 'mixed';
}

export class EatingBehaviorDto {
  @ApiProperty({ example: 3, required: false, minimum: 1, maximum: 8 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  mealsPerDay?: number;

  @ApiProperty({
    example: 'medium',
    required: false,
    enum: ['low', 'medium', 'high'],
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  snackingTendency?: 'low' | 'medium' | 'high';

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  eveningAppetite?: boolean;
}

export class SleepDto {
  @ApiProperty({ example: 7.5, required: false, minimum: 3, maximum: 12 })
  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(12)
  sleepHours?: number;

  @ApiProperty({
    example: 'late',
    required: false,
    enum: ['early', 'mid', 'late'],
  })
  @IsOptional()
  @IsIn(['early', 'mid', 'late'])
  chronotype?: 'early' | 'mid' | 'late';
}

export class Glp1ModuleDto {
  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isGlp1User?: boolean;

  @ApiProperty({
    example: 'semaglutide',
    required: false,
    enum: ['semaglutide', 'tirzepatide', 'liraglutide'],
  })
  @IsOptional()
  @IsIn(['semaglutide', 'tirzepatide', 'liraglutide'])
  drugType?: 'semaglutide' | 'tirzepatide' | 'liraglutide';

  @ApiProperty({
    example: 'preserve_muscle',
    required: false,
    enum: ['preserve_muscle', 'appetite_control', 'weight_maintenance', 'slow_weight_loss'],
  })
  @IsOptional()
  @IsIn(['preserve_muscle', 'appetite_control', 'weight_maintenance', 'slow_weight_loss'])
  therapyGoal?:
    | 'preserve_muscle'
    | 'appetite_control'
    | 'weight_maintenance'
    | 'slow_weight_loss';
}

export class HealthFocusDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  sugarControl?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  cholesterol?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  inflammation?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  iron?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  microbiome?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  hormonalBalance?: boolean;
}

export class HealthProfileDto {
  @ApiProperty({ required: false, type: MetabolicDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetabolicDto)
  metabolic?: MetabolicDto;

  @ApiProperty({ required: false, type: EatingBehaviorDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EatingBehaviorDto)
  eatingBehavior?: EatingBehaviorDto;

  @ApiProperty({ required: false, type: SleepDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SleepDto)
  sleep?: SleepDto;

  @ApiProperty({ required: false, type: Glp1ModuleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => Glp1ModuleDto)
  glp1Module?: Glp1ModuleDto;

  @ApiProperty({ required: false, type: HealthFocusDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HealthFocusDto)
  healthFocus?: HealthFocusDto;
}

