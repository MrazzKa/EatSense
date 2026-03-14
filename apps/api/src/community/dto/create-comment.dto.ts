import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great post!' })
  @IsString()
  content: string;
}
