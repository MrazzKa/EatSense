import { IsEmail, IsString, MinLength, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => (value || '').toString().trim().toLowerCase())
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => (value || '').toString().trim().toLowerCase())
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RequestOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => (value || '').toString().trim().toLowerCase())
  email!: string;
}

export class RequestMagicLinkDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => (value || '').toString().trim().toLowerCase())
  email!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => (value || '').toString().trim().toLowerCase())
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/)
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh-token-123' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class AppleSignInDto {
  @ApiProperty({ example: 'eyJraWQiOiJlWGF1...' })
  @IsString()
  @IsNotEmpty()
  identityToken!: string;

  @ApiProperty({ example: '001234.567890abcdef...' })
  @IsString()
  @IsNotEmpty()
  user!: string;

  @ApiProperty({ example: 'user@example.com', required: false })
  @IsEmail()
  @Transform(({ value }) => (value || '').toString().trim().toLowerCase())
  email?: string;

  @ApiProperty({ required: false })
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
}

export class GoogleSignInDto {
  @ApiProperty({ example: 'ya29.a0AfH6SMC...', required: false })
  @IsString()
  accessToken?: string;

  @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIs...', required: false })
  @IsString()
  idToken?: string;

  @ApiProperty({ example: 'user@example.com', required: false })
  @IsEmail()
  @Transform(({ value }) => (value || '').toString().trim().toLowerCase())
  email?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsString()
  name?: string;

  @ApiProperty({ example: 'https://lh3.googleusercontent.com/...', required: false })
  @IsString()
  picture?: string;
}
