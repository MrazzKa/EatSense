import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { MascotType } from '@prisma/client';

export class CreateMascotDto {
  @IsEnum(MascotType)
  mascotType: MascotType;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name: string;
}
