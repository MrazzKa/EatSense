import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectPharmacyDto {
  @ApiProperty({ example: 'Amavita Apotheke Bern', description: 'Pharmacy name' })
  @IsString()
  pharmacyName: string;

  @ApiPropertyOptional({ example: 'AMA-1234', description: 'Pharmacy connection code' })
  @IsOptional()
  @IsString()
  pharmacyCode?: string;

  @ApiPropertyOptional({ example: 'Marktgasse 12, 3011 Bern', description: 'Pharmacy address' })
  @IsOptional()
  @IsString()
  pharmacyAddress?: string;

  @ApiPropertyOptional({ example: '+41 31 311 22 33', description: 'Pharmacy phone' })
  @IsOptional()
  @IsString()
  pharmacyPhone?: string;

  @ApiPropertyOptional({ example: 'info@amavita-bern.ch', description: 'Pharmacy email' })
  @IsOptional()
  @IsString()
  pharmacyEmail?: string;
}
