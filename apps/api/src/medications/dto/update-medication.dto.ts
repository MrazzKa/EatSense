import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateMedicationDto } from './create-medication.dto';

export class UpdateMedicationDto extends PartialType(CreateMedicationDto) {
  @ApiPropertyOptional({ example: false, description: 'Is medication active' })
  isActive?: boolean;
}

