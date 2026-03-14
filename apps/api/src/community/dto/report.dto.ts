import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentId?: string;

  @ApiProperty({ example: 'Inappropriate content' })
  @IsString()
  reason: string;
}
