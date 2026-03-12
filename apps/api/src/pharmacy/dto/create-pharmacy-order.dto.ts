import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PharmacyOrderItemDto {
  @ApiProperty({ example: 'Metformin', description: 'Medication name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '500 mg', description: 'Dosage' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ example: '2 packs', description: 'Quantity' })
  @IsOptional()
  @IsString()
  quantity?: string;
}

export class CreatePharmacyOrderDto {
  @ApiPropertyOptional({ description: 'Connected pharmacy ID' })
  @IsOptional()
  @IsString()
  pharmacyConnectionId?: string;

  @ApiProperty({
    description: 'Order items',
    type: [PharmacyOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PharmacyOrderItemDto)
  items: PharmacyOrderItemDto[];

  @ApiPropertyOptional({ description: 'Prescription photo URL' })
  @IsOptional()
  @IsString()
  prescriptionUrl?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
