import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsBoolean, IsEnum, IsIn, IsNumber, MaxLength, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export const SUPPORTED_LANGUAGES = ['en', 'ru', 'kk', 'fr', 'de', 'es'] as const;

export class CreateExpertProfileDto {
    @IsIn(['dietitian', 'nutritionist', 'psychologist', 'endocrinologist', 'obgyn', 'pediatrician', 'gp', 'other'])
    type: string;

    @IsString()
    @MaxLength(100)
    displayName: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(4000)
    bio?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    education?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(70)
    experienceYears?: number;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    specializations?: string[];

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @IsIn(SUPPORTED_LANGUAGES as unknown as string[], { each: true })
    languages?: string[];

    @IsOptional()
    @IsString()
    @MaxLength(500)
    contactPolicy?: string;

    @IsOptional()
    @IsBoolean()
    videoEnabled?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(2)
    country?: string; // ISO 3166-1 alpha-2 (e.g. "KZ")
}

export class UpdateExpertProfileDto {
    @IsOptional()
    @IsIn(['dietitian', 'nutritionist', 'psychologist', 'endocrinologist', 'obgyn', 'pediatrician', 'gp', 'other'])
    type?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    displayName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(4000)
    bio?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    education?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(70)
    experienceYears?: number;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    specializations?: string[];

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @IsIn(SUPPORTED_LANGUAGES as unknown as string[], { each: true })
    languages?: string[];

    @IsOptional()
    @IsString()
    @MaxLength(500)
    contactPolicy?: string;

    @IsOptional()
    @IsBoolean()
    videoEnabled?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(2)
    country?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class PublishProfileDto {
    @IsBoolean()
    isPublished: boolean;
}

export class ExpertFiltersDto {
    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsString()
    specialization?: string;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    verified?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    minRating?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    @Type(() => Number)
    limit?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    offset?: number;

    @IsOptional()
    @IsString()
    search?: string;
}

export class CreateEducationDto {
    @IsString()
    @MaxLength(200)
    institution: string;

    @IsString()
    @MaxLength(200)
    degree: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    year?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    documentUrl?: string;

    @IsOptional()
    @IsIn(['pdf', 'image'])
    documentType?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    documentName?: string;
}

export class UpdateEducationDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    institution?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    degree?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    year?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    documentUrl?: string;

    @IsOptional()
    @IsIn(['pdf', 'image'])
    documentType?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    documentName?: string;
}

export class CreateCredentialDto {
    @IsString()
    @MaxLength(200)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    issuer?: string;

    @IsOptional()
    @IsString()
    issuedAt?: string;

    @IsOptional()
    @IsString()
    expiresAt?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    fileUrl?: string;

    @IsOptional()
    @IsIn(['pdf', 'image'])
    fileType?: string;
}

export enum OfferFormat {
    CHAT_CONSULTATION = 'CHAT_CONSULTATION',
    VIDEO_CONSULTATION = 'VIDEO_CONSULTATION',
    MEAL_PLAN = 'MEAL_PLAN',
    REPORT_REVIEW = 'REPORT_REVIEW',
    MONTHLY_SUPPORT = 'MONTHLY_SUPPORT',
    CUSTOM = 'CUSTOM',
}

export enum PriceType {
    FREE = 'FREE',
    FIXED = 'FIXED',
    FROM = 'FROM',
    CONTACT = 'CONTACT',
}

export class CreateOfferDto {
    @IsOptional()
    name?: Record<string, string>; // { en: "...", ru: "...", kk: "..." }

    @IsOptional()
    description?: Record<string, string>;

    @IsOptional()
    @IsEnum(OfferFormat)
    format?: OfferFormat;

    @IsOptional()
    @IsEnum(PriceType)
    priceType?: PriceType;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1_000_000)
    @Type(() => Number)
    priceAmount?: number;

    @IsOptional()
    @IsString()
    @MaxLength(8)
    currency?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(3650)
    @Type(() => Number)
    durationDays?: number;

    @IsOptional()
    @IsInt()
    @Min(5)
    @Max(240)
    @Type(() => Number)
    slotMinutes?: number;

    @IsOptional()
    deliverables?: Record<string, string[]>;

    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(1000)
    @Type(() => Number)
    sortOrder?: number;
}

export class UpdateOfferDto extends CreateOfferDto { }

export class PublishOfferDto {
    @IsBoolean()
    isPublished: boolean;
}

// ==================== ADMIN DTOs ====================

export class AdminCreateExpertDto {
    @IsString()
    @MaxLength(254)
    email: string;

    @IsIn(['dietitian', 'nutritionist', 'psychologist', 'endocrinologist', 'obgyn', 'pediatrician', 'gp', 'other'])
    type: string;

    @IsString()
    @MaxLength(100)
    displayName: string;

    @IsOptional() @IsString() @MaxLength(80)
    firstName?: string;

    @IsOptional() @IsString() @MaxLength(80)
    lastName?: string;

    @IsOptional() @IsString() @MaxLength(4000)
    bio?: string;

    @IsOptional() @IsString() @MaxLength(2)
    country?: string;

    @IsOptional() @IsString() @MaxLength(100)
    city?: string;

    @IsOptional() @IsString() @MaxLength(64)
    timezone?: string;

    @IsOptional() @IsString() @MaxLength(40)
    phone?: string;

    @IsOptional() @IsString() @MaxLength(100)
    licenseNumber?: string;

    @IsOptional() @IsString() @MaxLength(4000)
    education?: string;

    @IsOptional() @IsArray() @ArrayMaxSize(20)
    educationEntries?: any[];

    @IsOptional() @IsInt() @Min(0) @Max(70)
    experienceYears?: number;

    @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(50, { each: true })
    specializations?: string[];

    @IsOptional() @IsArray() @ArrayMaxSize(10)
    @IsIn(SUPPORTED_LANGUAGES as unknown as string[], { each: true })
    languages?: string[];

    @IsOptional() @IsString() @MaxLength(32)
    accessCode?: string;

    @IsOptional() @IsString() @MaxLength(1000)
    avatarUrl?: string;

    @IsOptional() @IsArray() @ArrayMaxSize(10)
    credentials?: any[];
}

export class AdminUpdateNotesDto {
    @IsOptional() @IsString() @MaxLength(8000)
    notes?: string | null;
}
