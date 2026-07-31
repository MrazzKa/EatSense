import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Granular privacy consents.
 *
 * These live inside `UserProfile.preferences`, but they get their own endpoint
 * because `PUT /user-profiles` REPLACES the whole preferences object — sending a
 * single flag through it would silently wipe the user's allergies and dietary
 * preferences. This DTO is merged, never replaced.
 */
export class UpdateConsentsDto {
  @ApiPropertyOptional({
    description:
      'Link the user\'s meal corrections (and the photos that produced them) to their account so they can be used to improve accuracy. OFF by default — corrections are still captured, but anonymously.',
  })
  @IsOptional()
  @IsBoolean()
  improveAccuracy?: boolean;

  @ApiPropertyOptional({
    description:
      'Allow activity/sleep data read from Apple Health / Health Connect to be sent to the AI that writes health feedback. Separate consent because that means sharing HealthKit data with a third party, which Apple requires to be explicit.',
  })
  @IsOptional()
  @IsBoolean()
  healthAiContext?: boolean;

  @ApiPropertyOptional({
    description: 'Allow a linked expert (nutritionist) to see activity data read from Apple Health / Health Connect.',
  })
  @IsOptional()
  @IsBoolean()
  healthShareWithExpert?: boolean;
}
