import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'text' })
  @IsEnum(['TEXT', 'PHOTO', 'DIET_SHARE', 'ACHIEVEMENT', 'EVENT', 'RECOMMENDATION'])
  type: string;

  @ApiProperty({ example: 'Check out this healthy recipe!' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'group-id-123' })
  @IsString()
  groupId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata (event details, diet info, etc.)' })
  @IsOptional()
  metadata?: any;
}
