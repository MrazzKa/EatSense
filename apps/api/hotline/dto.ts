import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHotlineRequestDto {
  @ApiPropertyOptional({ example: 'Второй день тянет под рёбрами после еды' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ description: 'Body-map report this request came from.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  symptomReportId?: string;

  @ApiPropertyOptional({ example: 'ru' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;
}

export class HotlineShiftDto {
  @ApiProperty({ example: 2, description: '0 = Sunday' })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @ApiProperty({ example: 1080, description: 'Minutes from local midnight' })
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute!: number;

  @ApiProperty({ example: 1260 })
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute!: number;

  @ApiProperty({ example: 'Europe/Zurich' })
  @IsString()
  @MaxLength(64)
  timezone!: string;
}

export class ReplaceHotlineShiftsDto {
  @ApiProperty({ type: [HotlineShiftDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => HotlineShiftDto)
  shifts!: HotlineShiftDto[];
}

export class HotlineHeartbeatDto {
  @ApiPropertyOptional({ example: 10, description: 'Minutes to stay on the line.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  minutes?: number;
}
