import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { ReportDto } from './dto/report.dto';

@ApiTags('Community')
@Controller('community')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('groups')
  @ApiOperation({ summary: 'List community groups' })
  async listGroups(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.communityService.listGroups(req.user.id, { type, search });
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get group by ID' })
  async getGroup(@Request() req: any, @Param('id') id: string) {
    return this.communityService.getGroup(req.user.id, id);
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create a new group' })
  async createGroup(@Request() req: any, @Body() dto: CreateGroupDto) {
    return this.communityService.createGroup(req.user.id, dto);
  }

  @Post('groups/:id/join')
  @ApiOperation({ summary: 'Join a group' })
  async joinGroup(@Request() req: any, @Param('id') id: string) {
    return this.communityService.joinGroup(req.user.id, id);
  }

  @Delete('groups/:id/leave')
  @ApiOperation({ summary: 'Leave a group' })
  async leaveGroup(@Request() req: any, @Param('id') id: string) {
    return this.communityService.leaveGroup(req.user.id, id);
  }

  @Get('groups/:id/posts')
  @ApiOperation({ summary: 'Get posts in a group' })
  async getGroupPosts(
    @Request() req: any,
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.communityService.getGroupPosts(
      req.user.id,
      id,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get aggregated feed from joined groups' })
  async getFeed(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.communityService.getFeed(
      req.user.id,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get a single post' })
  async getPost(@Request() req: any, @Param('id') id: string) {
    return this.communityService.getPost(req.user.id, id);
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create a new post' })
  async createPost(@Request() req: any, @Body() dto: CreatePostDto) {
    return this.communityService.createPost(req.user.id, dto);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete a post' })
  async deletePost(@Request() req: any, @Param('id') id: string) {
    return this.communityService.deletePost(req.user.id, id);
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Update post metadata' })
  async updatePost(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { metadata?: any },
  ) {
    return this.communityService.updatePost(id, req.user.id, body);
  }

  @Post('posts/:id/like')
  @ApiOperation({ summary: 'Toggle like on a post' })
  async toggleLike(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { type?: string },
  ) {
    return this.communityService.toggleLike(req.user.id, id, body?.type);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get comments on a post' })
  async getComments(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.communityService.getComments(
      id,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  async createComment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(req.user.id, id, dto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(@Request() req: any, @Param('id') id: string) {
    return this.communityService.deleteComment(req.user.id, id);
  }

  @Post('report')
  @ApiOperation({ summary: 'Report a post or comment' })
  async report(@Request() req: any, @Body() dto: ReportDto) {
    return this.communityService.report(req.user.id, dto);
  }

  @Post('posts/:id/attend')
  @ApiOperation({ summary: 'Toggle event attendance' })
  async toggleAttendance(@Request() req: any, @Param('id') id: string) {
    return this.communityService.toggleAttendance(req.user.id, id);
  }

  @Get('my-groups')
  @ApiOperation({ summary: 'Get groups the current user is a member of' })
  async getMyGroups(@Request() req: any) {
    return this.communityService.getMyGroups(req.user.id);
  }

  @Get('my-city')
  @ApiOperation({ summary: 'Get the current user city group' })
  async getMyCity(@Request() req: any) {
    return this.communityService.getMyCity(req.user.id);
  }

  @Put('my-city')
  @ApiOperation({ summary: 'Set the current user city group' })
  async setMyCity(@Request() req: any, @Body() body: { groupId: string }) {
    return this.communityService.setMyCity(req.user.id, body.groupId);
  }

  @Get('users/:id/profile')
  @ApiOperation({ summary: 'Get author mini-profile' })
  async getUserProfile(@Request() req: any, @Param('id') id: string) {
    return this.communityService.getUserProfile(id, req.user.id);
  }
}
