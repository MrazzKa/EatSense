import { IsEnum, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { MascotType } from '@prisma/client';

export class UpdateMascotDto {
  @IsOptional()
  @IsEnum(MascotType)
  mascotType?: MascotType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name?: string;
}
