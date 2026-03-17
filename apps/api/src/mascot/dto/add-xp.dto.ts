import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class AddXpDto {
  @IsInt()
  @Min(1)
  @Max(100)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
