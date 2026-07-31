import { Controller, Post, Get, Put, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserProfilesService } from './user-profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateConsentsDto } from './dto/update-consents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('User Profiles')
@Controller('user-profiles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserProfilesController {
  private readonly logger = new Logger(UserProfilesController.name);

  constructor(private readonly userProfilesService: UserProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create user profile' })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  async createProfile(@Request() req: any, @Body() profileData: any) {
    const userId = req.user.id;
    this.logger.log(`[user-profiles] POST create userId=${userId}`);
    return this.userProfilesService.createProfile(userId, profileData);
  }

  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req: any) {
    const userId = req.user.id;
    this.logger.log(`[user-profiles] GET userId=${userId}`);
    return await this.userProfilesService.getProfile(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user.id;
    this.logger.log(`[user-profiles] PUT update userId=${userId}`);
    return this.userProfilesService.updateProfile(userId, dto);
  }

  @Get('consents')
  @ApiOperation({ summary: 'Read granular privacy consents (all default to false)' })
  @ApiResponse({ status: 200, description: 'Consents retrieved successfully' })
  async getConsents(@Request() req: any) {
    return this.userProfilesService.getConsents(req.user.id);
  }

  @Put('consents')
  @ApiOperation({
    summary: 'Update granular privacy consents',
    description:
      'Merges into preferences — unlike PUT /user-profiles, which replaces the whole preferences object. Turning off improveAccuracy also anonymizes corrections already stored for this user.',
  })
  @ApiResponse({ status: 200, description: 'Consents updated successfully' })
  async updateConsents(@Request() req: any, @Body() dto: UpdateConsentsDto) {
    const userId = req.user.id;
    this.logger.log(`[user-profiles] PUT consents userId=${userId}`);
    return this.userProfilesService.updateConsents(userId, dto);
  }

  @Post('complete-onboarding')
  @ApiOperation({ summary: 'Complete onboarding' })
  @ApiResponse({ status: 200, description: 'Onboarding completed successfully' })
  async completeOnboarding(@Request() req: any) {
    const userId = req.user.id;
    this.logger.log(`[user-profiles] POST complete-onboarding userId=${userId}`);
    return this.userProfilesService.completeOnboarding(userId);
  }
}
