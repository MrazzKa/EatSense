import { IsIn, IsOptional, IsString } from 'class-validator';

export type LabResultsType =
  | 'auto'
  | 'cbc'
  | 'biochemistry'
  | 'lipid'
  | 'glycemic'
  | 'vitamins'
  | 'hormones'
  | 'inflammation'
  | 'other';

export class AnalyzeLabResultsDto {
  @IsString()
  @IsIn([
    'auto',
    'cbc',
    'biochemistry',
    'lipid',
    'glycemic',
    'vitamins',
    'hormones',
    'inflammation',
    'other',
  ])
  type: LabResultsType;

  @IsOptional()
  @IsString()
  manualText?: string;
}

