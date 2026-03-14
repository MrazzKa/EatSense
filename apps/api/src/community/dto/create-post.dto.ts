import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityPostType } from '@prisma/client';

export class CreatePostDto {
  @ApiProperty({ example: 'TEXT', enum: CommunityPostType })
  @IsEnum(CommunityPostType)
  type: CommunityPostType;

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
