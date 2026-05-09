import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException, ConflictException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { ReportDto } from './dto/report.dto';
import { normalizeSupportedCountryCode } from '../common/country-codes';

const authorInclude = {
  select: {
    id: true,
    email: true,
    userProfile: {
      select: { firstName: true, lastName: true, avatarUrl: true },
    },
  },
};

const publicGroupSelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  country: true,
};

function normalizeCityKey(city: unknown): string | null {
  if (typeof city !== 'string') return null;
  const key = city
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
  return key || null;
}

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  private async ensureUserCountryCommunity(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { country: true, cityGroupId: true },
    });
    const code = normalizeSupportedCountryCode(profile?.country);
    if (!code) return null;

    let group = await this.prisma.communityGroup.findFirst({
      where: { type: 'COUNTRY' as any, country: code },
      orderBy: [{ isSeeded: 'desc' }, { createdAt: 'asc' }],
    });

    if (!group) {
      const slug = `country-${code.toLowerCase()}`;
      group = await this.prisma.communityGroup.upsert({
        where: { slug },
        update: { country: code, type: 'COUNTRY' as any },
        create: {
          name: `Community ${code}`,
          slug,
          type: 'COUNTRY' as any,
          country: code,
          isSeeded: true,
        },
      });
    }

    await this.prisma.communityMembership.deleteMany({
      where: {
        userId,
        group: { type: 'COUNTRY' as any, NOT: { id: group.id } },
      },
    });

    await this.prisma.communityMembership.upsert({
      where: { userId_groupId: { userId, groupId: group.id } },
      create: { userId, groupId: group.id, role: 'MEMBER', guidelinesAccepted: true },
      update: { guidelinesAccepted: true },
    });

    if (profile?.cityGroupId !== group.id) {
      await this.prisma.userProfile.update({
        where: { userId },
        data: { cityGroupId: group.id },
      });
    }

    return group;
  }

  private async ensureRequestedGroupIsCurrentCountry(userId: string, groupId: string) {
    const countryGroup = await this.ensureUserCountryCommunity(userId);
    if (!countryGroup || countryGroup.id !== groupId) {
      throw new NotFoundException('Group not found');
    }
    return countryGroup;
  }

  private async ensurePostIsInCurrentCountry(userId: string, postId: string) {
    const [countryGroup, post] = await Promise.all([
      this.ensureUserCountryCommunity(userId),
      this.prisma.communityPost.findUnique({
        where: { id: postId },
        select: { id: true, groupId: true },
      }),
    ]);
    if (!post || !countryGroup || post.groupId !== countryGroup.id) {
      throw new NotFoundException('Post not found');
    }
  }

  async listGroups(userId: string, query: { type?: string; search?: string }) {
    const countryGroup = await this.ensureUserCountryCommunity(userId);
    if (!countryGroup) {
      return [];
    }
    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }

    if (countryGroup && (!query.type || query.type === 'COUNTRY')) {
      where.id = countryGroup.id;
      where.type = 'COUNTRY';
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const groups = await this.prisma.communityGroup.findMany({
      where,
      include: {
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch user's memberships to determine isMember
    const myMemberships = await this.prisma.communityMembership.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const myGroupIds = new Set(myMemberships.map((m) => m.groupId));

    return groups.map((g) => ({
      ...g,
      isMember: myGroupIds.has(g.id),
    }));
  }

  async getGroup(userId: string, id: string) {
    await this.ensureRequestedGroupIsCurrentCountry(userId, id);
    const group = await this.prisma.communityGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memberships: true, posts: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = await this.prisma.communityMembership.findUnique({
      where: { userId_groupId: { userId, groupId: id } },
    });

    return {
      ...group,
      isMember: !!membership,
      guidelinesAccepted: membership?.guidelinesAccepted ?? false,
    };
  }

  async createGroup(userId: string, dto: CreateGroupDto) {
    const existingOwned = await this.prisma.communityGroup.findFirst({
      where: { createdById: userId, type: 'CUSTOM' },
      select: { id: true, name: true },
    });
    if (existingOwned) {
      throw new ConflictException({
        code: 'COMMUNITY_LIMIT_REACHED',
        message: 'You can create only one community. Delete your existing community to create a new one.',
        existingGroupId: existingOwned.id,
        existingGroupName: existingOwned.name,
      });
    }

    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const group = await this.prisma.communityGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        slug: uniqueSlug,
        type: 'CUSTOM',
        createdById: userId,
        memberships: {
          create: {
            userId,
            role: 'ADMIN',
            guidelinesAccepted: true,
          },
        },
      },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });

    return { ...group, isMember: true };
  }

  async joinGroup(userId: string, groupId: string) {
    await this.ensureRequestedGroupIsCurrentCountry(userId, groupId);

    const membership = await this.prisma.communityMembership.upsert({
      where: {
        userId_groupId: { userId, groupId },
      },
      create: {
        userId,
        groupId,
        role: 'MEMBER',
        guidelinesAccepted: true,
      },
      update: { guidelinesAccepted: true },
    });

    return {
      ...membership,
      guidelinesAccepted: membership.guidelinesAccepted,
    };
  }

  async acceptGuidelines(userId: string, groupId: string) {
    await this.ensureRequestedGroupIsCurrentCountry(userId, groupId);
    const membership = await this.prisma.communityMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this group');
    }

    return this.prisma.communityMembership.update({
      where: { userId_groupId: { userId, groupId } },
      data: {
        guidelinesAccepted: true,
        guidelinesVersion: 1,
      },
    });
  }

  async getGuidelinesStatus(userId: string, groupId: string) {
    await this.ensureRequestedGroupIsCurrentCountry(userId, groupId);
    const membership = await this.prisma.communityMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      return { isMember: false, guidelinesAccepted: false };
    }

    return {
      isMember: true,
      guidelinesAccepted: membership.guidelinesAccepted,
      guidelinesVersion: membership.guidelinesVersion,
    };
  }

  async leaveGroup(userId: string, groupId: string) {
    await this.ensureRequestedGroupIsCurrentCountry(userId, groupId);
    const [group, profile] = await Promise.all([
      this.prisma.communityGroup.findUnique({
        where: { id: groupId },
        select: { type: true, country: true },
      }),
      this.prisma.userProfile.findUnique({
        where: { userId },
        select: { country: true },
      }),
    ]);
    const currentCountry = normalizeSupportedCountryCode(profile?.country);
    if (group?.type === 'COUNTRY' && group.country === currentCountry) {
      throw new ForbiddenException('Your country community is selected automatically and cannot be left.');
    }

    await this.prisma.communityMembership.deleteMany({
      where: { userId, groupId },
    });

    return { message: 'Left group successfully' };
  }

  /**
   * Visibility filter for moderation: hides "pending" and "rejected" posts
   * from non-authors. Legacy posts without `moderationStatus` are treated as
   * visible (don't break old content). Authors always see their own posts.
   */
  private moderationVisibilityWhere(userId: string) {
    return {
      OR: [
        // Author always sees their own posts (any status).
        { authorId: userId },
        // Everyone else: must be neither pending nor rejected.
        // Legacy posts without `moderationStatus` are visible (Prisma JSON path
        // equality returns false when the path is missing, so neither AND clause
        // negation excludes them).
        {
          AND: [
            { NOT: { metadata: { path: ['moderationStatus'], equals: 'pending' } } },
            { NOT: { metadata: { path: ['moderationStatus'], equals: 'rejected' } } },
          ],
        },
      ],
    };
  }

  async getGroupPosts(userId: string, groupId: string, page: number, limit: number) {
    await this.ensureRequestedGroupIsCurrentCountry(userId, groupId);
    const skip = (page - 1) * limit;

    const where: any = {
      groupId,
      ...this.moderationVisibilityWhere(userId),
    };

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: authorInclude,
          _count: {
            select: { comments: true, likes: true, attendees: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    const enriched = await this.enrichPostsWithUserState(userId, posts);

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFeed(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const countryGroup = await this.ensureUserCountryCommunity(userId);

    if (!countryGroup) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const where: any = {
      groupId: countryGroup.id,
      ...this.moderationVisibilityWhere(userId),
    };

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: authorInclude,
          group: {
            select: publicGroupSelect,
          },
          _count: {
            select: { comments: true, likes: true, attendees: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    const enriched = await this.enrichPostsWithUserState(userId, posts);

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPost(userId: string, postId: string) {
    const countryGroup = await this.ensureUserCountryCommunity(userId);
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        author: authorInclude,
        group: true,
        _count: { select: { comments: true, attendees: true, likes: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (!countryGroup || post.groupId !== countryGroup.id) {
      throw new NotFoundException('Post not found');
    }

    // Hide pending/rejected posts from non-authors. 404 (not 403) so admins'
    // workflow doesn't leak the post's existence.
    const status = (post.metadata as any)?.moderationStatus;
    if ((status === 'pending' || status === 'rejected') && post.authorId !== userId) {
      throw new NotFoundException('Post not found');
    }

    const like = await this.prisma.communityLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    const attendee = post.type === 'EVENT'
      ? await this.prisma.eventAttendee.findUnique({
          where: { userId_postId: { userId, postId } },
        })
      : null;

    return {
      ...post,
      isLiked: !!like,
      isAttending: !!attendee,
    };
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const countryGroup = await this.ensureUserCountryCommunity(userId);
    const targetGroupId = countryGroup?.id;
    if (!targetGroupId) {
      throw new BadRequestException('Country community is not configured for this user.');
    }

    // Check guidelines acceptance
    const membership = await this.prisma.communityMembership.findUnique({
      where: { userId_groupId: { userId, groupId: targetGroupId } },
    });

    if (!membership) {
      throw new ForbiddenException('You must join this group before posting');
    }

    if (!membership.guidelinesAccepted) {
      throw new ForbiddenException('You must accept community guidelines before posting');
    }

    if (dto.type === 'DIET_SHARE') {
      const subscription = await this.subscriptionsService.getActiveSubscription(userId);
      if (!subscription) {
        throw new ForbiddenException('Active subscription required to share diet posts');
      }
    }

    // Moderation: every new post enters as "pending" and is hidden from public
    // feeds until an admin approves it. Author still sees it in their own views.
    // Stored under metadata to avoid a Prisma migration; admin endpoints flip it.
    const metadata = dto.type === 'BEST_PLACES'
      ? {
          ...(dto.metadata || {}),
          cityKey: normalizeCityKey((dto.metadata as any)?.city),
        }
      : (dto.metadata || {});
    const metadataWithModeration = {
      ...metadata,
      moderationStatus: 'pending',
      moderationSubmittedAt: new Date().toISOString(),
    };

    return this.prisma.communityPost.create({
      data: {
        type: dto.type,
        content: dto.content,
        groupId: targetGroupId,
        authorId: userId,
        imageUrl: dto.imageUrl,
        metadata: metadataWithModeration,
        likesCount: 0,
      },
      include: {
        author: authorInclude,
      },
    });
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.communityPost.delete({
      where: { id: postId },
    });

    return { message: 'Post deleted successfully' };
  }

  async toggleLike(userId: string, postId: string, type: string = 'LIKE') {
    await this.ensurePostIsInCurrentCountry(userId, postId);
    const existing = await this.prisma.communityLike.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      if (existing.reactionType !== type) {
        // Different reaction type → update reaction, keep like count
        await this.prisma.communityLike.update({
          where: { userId_postId: { userId, postId } },
          data: { reactionType: type },
        });
        return { liked: true, type };
      }

      // Same reaction type → un-react
      await this.prisma.communityLike.delete({
        where: { userId_postId: { userId, postId } },
      });

      await this.prisma.communityPost.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });

      return { liked: false, type };
    } else {
      await this.prisma.communityLike.create({
        data: { userId, postId, reactionType: type },
      });

      await this.prisma.communityPost.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });

      return { liked: true, type };
    }
  }

  async getComments(userId: string, postId: string, page: number, limit: number) {
    await this.ensurePostIsInCurrentCountry(userId, postId);
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.communityComment.findMany({
        where: { postId },
        include: {
          author: authorInclude,
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.communityComment.count({ where: { postId } }),
    ]);

    return {
      data: comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    await this.ensurePostIsInCurrentCountry(userId, postId);
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.communityComment.create({
      data: {
        content: dto.content,
        postId,
        authorId: userId,
      },
      include: {
        author: authorInclude,
      },
    });
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.communityComment.delete({
      where: { id: commentId },
    });

    return { message: 'Comment deleted successfully' };
  }

  async report(userId: string, dto: ReportDto) {
    return this.prisma.communityReport.create({
      data: {
        userId,
        postId: dto.postId,
        commentId: dto.commentId,
        reason: dto.reason,
      },
    });
  }

  async toggleAttendance(userId: string, postId: string) {
    await this.ensurePostIsInCurrentCountry(userId, postId);
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.type !== 'EVENT') {
      throw new BadRequestException('Can only attend event posts');
    }

    const existing = await this.prisma.eventAttendee.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      await this.prisma.eventAttendee.delete({
        where: { userId_postId: { userId, postId } },
      });
      return { attending: false };
    } else {
      await this.prisma.eventAttendee.create({
        data: { userId, postId },
      });
      return { attending: true };
    }
  }

  async getMyOwnedCommunity(userId: string) {
    return null;
  }

  async deleteOwnedCommunity(userId: string, groupId: string) {
    const group = await this.prisma.communityGroup.findUnique({
      where: { id: groupId },
      select: { id: true, createdById: true, type: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (group.type !== 'CUSTOM' || group.createdById !== userId) {
      throw new ForbiddenException('Only the creator can delete a custom community');
    }
    await this.prisma.communityGroup.delete({ where: { id: groupId } });
    return { success: true };
  }

  async getMyGroups(userId: string) {
    const countryGroup = await this.ensureUserCountryCommunity(userId);
    if (!countryGroup) {
      return [];
    }

    const memberships = await this.prisma.communityMembership.findMany({
      where: { userId, groupId: countryGroup.id },
      include: {
        group: {
          include: {
            _count: {
              select: { memberships: true },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.group,
      role: m.role,
      isMember: true,
      guidelinesAccepted: m.guidelinesAccepted,
    }));
  }

  async getMyCity(userId: string) {
    const countryGroup = await this.ensureUserCountryCommunity(userId);
    if (countryGroup) {
      return this.prisma.communityGroup.findUnique({
        where: { id: countryGroup.id },
        include: {
          _count: {
            select: { memberships: true },
          },
        },
      });
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { cityGroupId: true },
    });

    if (!profile || !profile.cityGroupId) {
      return null;
    }

    return this.prisma.communityGroup.findUnique({
      where: { id: profile.cityGroupId },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });
  }

  async setMyCity(userId: string, groupId: string) {
    await this.ensureRequestedGroupIsCurrentCountry(userId, groupId);

    await this.prisma.userProfile.update({
      where: { userId },
      data: { cityGroupId: groupId },
    });

    // Join the city group and auto-accept guidelines (city groups don't require manual acceptance)
    await this.prisma.communityMembership.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId, role: 'MEMBER', guidelinesAccepted: true },
      update: { guidelinesAccepted: true },
    });

    return { message: 'City updated successfully', groupId };
  }

  async updatePost(postId: string, userId: string, data: { metadata?: any }) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { metadata: data.metadata },
      include: {
        author: authorInclude,
      },
    });
  }

  async getUserProfile(targetUserId: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        userProfile: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [postCount, cityMembership] = await Promise.all([
      this.prisma.communityPost.count({
        where: { authorId: targetUserId },
      }),
      this.prisma.communityMembership.findFirst({
        where: { userId: targetUserId, group: { type: 'CITY' } },
        include: { group: { select: { name: true } } },
      }),
    ]);

    return {
      id: user.id,
      firstName: user.userProfile?.firstName ?? null,
      lastName: user.userProfile?.lastName ?? null,
      avatarUrl: user.userProfile?.avatarUrl ?? null,
      cityGroup: cityMembership?.group?.name ?? null,
      postCount,
      memberSince: user.createdAt,
    };
  }

  // ==================== ADMIN MODERATION ====================

  async getReports(status?: string) {
    return this.prisma.communityReport.findMany({
      where: status ? { status: status as any } : {},
      include: {
        user: {
          select: { id: true, email: true, userProfile: { select: { firstName: true, lastName: true } } },
        },
        post: {
          select: { id: true, content: true, authorId: true, groupId: true, type: true, createdAt: true,
            author: { select: { id: true, email: true, userProfile: { select: { firstName: true, lastName: true } } } },
            group: { select: { id: true, name: true } },
          },
        },
        comment: {
          select: { id: true, content: true, authorId: true, createdAt: true,
            author: { select: { id: true, email: true, userProfile: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async resolveReport(reportId: string, deleteContent: boolean = false) {
    const report = await this.prisma.communityReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Optionally delete the reported content
    if (deleteContent) {
      if (report.postId) {
        await this.prisma.communityPost.delete({ where: { id: report.postId } }).catch(() => {});
      }
      if (report.commentId) {
        await this.prisma.communityComment.delete({ where: { id: report.commentId } }).catch(() => {});
      }
    }

    await this.prisma.communityReport.update({
      where: { id: reportId },
      data: { status: 'RESOLVED' },
    });

    return { success: true, status: 'RESOLVED', contentDeleted: deleteContent };
  }

  async dismissReport(reportId: string) {
    const report = await this.prisma.communityReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    await this.prisma.communityReport.update({
      where: { id: reportId },
      data: { status: 'DISMISSED' },
    });

    return { success: true, status: 'DISMISSED' };
  }

  async adminDeletePost(postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.communityPost.delete({ where: { id: postId } });

    return { success: true, message: 'Post deleted by admin' };
  }

  // ==================== POST MODERATION ====================

  async listPendingPosts(type?: string, page = 1, limit = 50) {
    const where: any = {
      metadata: { path: ['moderationStatus'], equals: 'pending' },
    };
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: authorInclude,
          group: { select: publicGroupSelect },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async moderatePost(postId: string, decision: 'approve' | 'reject', reason?: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const newStatus = decision === 'approve' ? 'approved' : 'rejected';
    const meta = (post.metadata as any) || {};

    await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        metadata: {
          ...meta,
          moderationStatus: newStatus,
          moderationDecidedAt: new Date().toISOString(),
          moderationReason: reason || null,
        },
      },
    });

    // Notify the author. Push if available, otherwise the status simply
    // updates the next time the author opens the app (in-app banner).
    if (this.notifications) {
      try {
        const title = decision === 'approve'
          ? 'Your post was approved'
          : 'Your post was rejected';
        const body = decision === 'approve'
          ? 'It is now visible to the community.'
          : reason || 'Please review community guidelines and try again.';
        await this.notifications.sendPushNotification(post.authorId, title, body, {
          type: 'post_moderation',
          postId,
          decision: newStatus,
        });
      } catch (e: any) {
        this.logger.warn(`[CommunityService] Failed to push moderation notification: ${e?.message}`);
      }
    }

    return { success: true, postId, status: newStatus };
  }

  async adminDeleteComment(commentId: string) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.prisma.communityComment.delete({ where: { id: commentId } });

    return { success: true, message: 'Comment deleted by admin' };
  }

  // ==================== BEST PLACES ====================

  async getBestPlaces(userId: string, page: number, limit: number, groupId?: string, city?: string) {
    const skip = (page - 1) * limit;
    const countryGroup = await this.ensureUserCountryCommunity(userId);

    const where: any = { type: 'BEST_PLACES' as any };

    if (countryGroup) {
      where.groupId = countryGroup.id;
    } else {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Apply unified moderation visibility (same as feed/group): hide pending
    // and rejected from non-authors; legacy posts without the field stay visible.
    Object.assign(where, this.moderationVisibilityWhere(userId));

    // Optional city filter — stored in metadata.city. Combined via AND.
    const cityKey = normalizeCityKey(city);
    if (cityKey) {
      const rawCity = city!.trim();
      where.AND = [
        {
          OR: [
            { metadata: { path: ['cityKey'], equals: cityKey } },
            { metadata: { path: ['city'], equals: rawCity } },
          ],
        },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: authorInclude,
          group: {
            select: publicGroupSelect,
          },
          _count: {
            select: { comments: true, likes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    const enriched = await this.enrichPostsWithUserState(userId, posts);

    // Aggregate average ratings per place name
    const placeRatings = new Map<string, { total: number; count: number }>();
    for (const post of enriched) {
      const meta = post.metadata as any;
      const placeName = meta?.placeName;
      const rating = meta?.rating;
      if (placeName && typeof rating === 'number' && rating > 0) {
        const existing = placeRatings.get(placeName) || { total: 0, count: 0 };
        existing.total += rating;
        existing.count += 1;
        placeRatings.set(placeName, existing);
      }
    }

    // Enrich posts with avgRating for the place
    const enrichedWithRatings = enriched.map((post) => {
      const meta = post.metadata as any;
      const placeName = meta?.placeName;
      const stats = placeName ? placeRatings.get(placeName) : null;
      return {
        ...post,
        placeAvgRating: stats ? Math.round((stats.total / stats.count) * 10) / 10 : null,
        placeReviewCount: stats ? stats.count : 0,
      };
    });

    return {
      data: enrichedWithRatings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Helper: enrich posts with isLiked and isAttending for current user
  private async enrichPostsWithUserState(userId: string, posts: any[]) {
    if (posts.length === 0) return posts;

    const postIds = posts.map((p) => p.id);

    const [likes, attendances] = await Promise.all([
      this.prisma.communityLike.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
      this.prisma.eventAttendee.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);

    const likedSet = new Set(likes.map((l) => l.postId));
    const attendingSet = new Set(attendances.map((a) => a.postId));

    return posts.map((p) => ({
      ...p,
      isLiked: likedSet.has(p.id),
      isAttending: attendingSet.has(p.id),
    }));
  }
}
