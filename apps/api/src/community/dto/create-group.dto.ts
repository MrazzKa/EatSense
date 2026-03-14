import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Vegan Foodies Zürich' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'A group for vegan food lovers in Zürich' })
  @IsOptional()
  @IsString()
  description?: string;
}
