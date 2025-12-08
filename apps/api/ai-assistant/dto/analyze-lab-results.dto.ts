import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class AnalyzeLabResultsDto {
  @IsString()
  @IsIn(['text', 'file'])
  inputType: 'text' | 'file';

  @ValidateIf((o) => o.inputType === 'text')
  @IsString()
  @IsNotEmpty()
  text?: string;

  @ValidateIf((o) => o.inputType === 'file')
  @IsOptional()
  @IsString()
  fileId?: string;

  @ValidateIf((o) => o.inputType === 'file')
  @IsOptional()
  @IsString()
  fileName?: string;

  @ValidateIf((o) => o.inputType === 'file')
  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

