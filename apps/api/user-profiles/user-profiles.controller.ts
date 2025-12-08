import { Controller, Post, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserProfilesService } from './user-profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('User Profiles')
@Controller('user-profiles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserProfilesController {
  constructor(private readonly userProfilesService: UserProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create user profile' })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  async createProfile(@Request() req, @Body() profileData: any) {
    const userId = req.user.id;
    return this.userProfilesService.createProfile(userId, profileData);
  }

  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req) {
    const userId = req.user.id;
    // getProfile now always returns a profile (creates default if missing)
    return await this.userProfilesService.getProfile(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    const userId = req.user.id;
    return this.userProfilesService.updateProfile(userId, dto);
  }

  @Post('complete-onboarding')
  @ApiOperation({ summary: 'Complete onboarding' })
  @ApiResponse({ status: 200, description: 'Onboarding completed successfully' })
  async completeOnboarding(@Request() req) {
    const userId = req.user.id;
    return this.userProfilesService.completeOnboarding(userId);
  }
}
