import { Controller, Get, Post, Put, Delete, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Request() req: any,
  ) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteAccount(@Request() req: any) {
    return this.usersService.deleteAccount(req.user.id);
  }

  /**
   * GET /users/export used to live here and returned the whole export to the
   * app, which then wrote a file and offered a share sheet. It was removed
   * deliberately: personal data now only leaves the company through us, so the
   * user files a request and we email the copy back.
   *
   * Removing the endpoint rather than leaving it unused matters — an authorised
   * caller could otherwise still pull a full personal-data dump straight out of
   * the API and bypass the process entirely.
   */
  @Post('data-request')
  @ApiOperation({
    summary: 'Request a copy of your personal data (GDPR Art. 15/20)',
    description:
      'Records the request, notifies the team and confirms by email. An already-open request is returned instead of being duplicated.',
  })
  @ApiResponse({ status: 201, description: 'Request recorded' })
  async requestDataExport(@Request() req: any) {
    return this.usersService.requestDataExport(req.user.id, 'app');
  }

  @Get('data-request')
  @ApiOperation({ summary: 'Whether this account already has an open data request' })
  @ApiResponse({ status: 200, description: 'Current request status' })
  async getDataRequestStatus(@Request() req: any) {
    return this.usersService.getDataExportRequestStatus(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getUserStats(@Request() req: any) {
    return this.usersService.getUserStats(req.user.id);
  }

  @Get('report')
  @ApiOperation({ summary: 'Get user report' })
  @ApiResponse({ status: 200, description: 'User report retrieved successfully' })
  async getUserReport(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.usersService.getUserReport(req.user.id, from, to);
  }
}
