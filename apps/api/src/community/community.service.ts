import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { ReportDto } from './dto/report.dto';

const authorInclude = {
  select: {
    id: true,
    email: true,
    userProfile: {
      select: { firstName: true, lastName: true, avatarUrl: true },
    },
  },
};

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async listGroups(userId: string, query: { type?: string; search?: string }) {
    const where: any = {};

    if (query.type) {
      where.type = query.type;
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
    const group = await this.prisma.communityGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const membership = await this.prisma.communityMembership.upsert({
      where: {
        userId_groupId: { userId, groupId },
      },
      create: {
        userId,
        groupId,
        role: 'MEMBER',
        guidelinesAccepted: false,
      },
      update: {},
    });

    return {
      ...membership,
      guidelinesAccepted: membership.guidelinesAccepted,
    };
  }

  async acceptGuidelines(userId: string, groupId: string) {
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
    await this.prisma.communityMembership.deleteMany({
      where: { userId, groupId },
    });

    return { message: 'Left group successfully' };
  }

  async getGroupPosts(userId: string, groupId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: { groupId },
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
      this.prisma.communityPost.count({ where: { groupId } }),
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

    const memberships = await this.prisma.communityMembership.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);

    if (groupIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: { groupId: { in: groupIds } },
        include: {
          author: authorInclude,
          group: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { comments: true, likes: true, attendees: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.communityPost.count({
        where: { groupId: { in: groupIds } },
      }),
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
    // Check guidelines acceptance
    const membership = await this.prisma.communityMembership.findUnique({
      where: { userId_groupId: { userId, groupId: dto.groupId } },
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

    return this.prisma.communityPost.create({
      data: {
        type: dto.type,
        content: dto.content,
        groupId: dto.groupId,
        authorId: userId,
        imageUrl: dto.imageUrl,
        metadata: dto.metadata,
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

  async getComments(postId: string, page: number, limit: number) {
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
    const group = await this.prisma.communityGroup.findFirst({
      where: { createdById: userId, type: 'CUSTOM' },
      include: {
        _count: { select: { memberships: true, posts: true } },
      },
    });
    return group;
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
    const memberships = await this.prisma.communityMembership.findMany({
      where: { userId },
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
    const group = await this.prisma.communityGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

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
