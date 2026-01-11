import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpertProfileDto {
    @IsString()
    type: 'dietitian' | 'nutritionist';

    @IsString()
    displayName: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    education?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    experienceYears?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    specializations?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    languages?: string[];

    @IsOptional()
    @IsString()
    contactPolicy?: string;
}

export class UpdateExpertProfileDto {
    @IsOptional()
    @IsString()
    type?: 'dietitian' | 'nutritionist';

    @IsOptional()
    @IsString()
    displayName?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    education?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    experienceYears?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    specializations?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    languages?: string[];

    @IsOptional()
    @IsString()
    contactPolicy?: string;

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

export class CreateCredentialDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    issuer?: string;

    @IsOptional()
    @IsString()
    issuedAt?: string;

    @IsOptional()
    @IsString()
    expiresAt?: string;

    @IsOptional()
    @IsString()
    fileUrl?: string;

    @IsOptional()
    @IsString()
    fileType?: string;
}

export enum OfferFormat {
    CHAT_CONSULTATION = 'CHAT_CONSULTATION',
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
    @Type(() => Number)
    priceAmount?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    durationDays?: number;

    @IsOptional()
    deliverables?: Record<string, string[]>;

    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    sortOrder?: number;
}

export class UpdateOfferDto extends CreateOfferDto { }

export class PublishOfferDto {
    @IsBoolean()
    isPublished: boolean;
}
