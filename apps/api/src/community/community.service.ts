import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
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
    };
  }

  async createGroup(userId: string, dto: CreateGroupDto) {
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

    return this.prisma.communityMembership.upsert({
      where: {
        userId_groupId: { userId, groupId },
      },
      create: {
        userId,
        groupId,
        role: 'MEMBER',
      },
      update: {},
    });
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

  async toggleLike(userId: string, postId: string) {
    const existing = await this.prisma.communityLike.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      await this.prisma.communityLike.delete({
        where: { userId_postId: { userId, postId } },
      });

      await this.prisma.communityPost.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });

      return { liked: false };
    } else {
      await this.prisma.communityLike.create({
        data: { userId, postId },
      });

      await this.prisma.communityPost.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });

      return { liked: true };
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

    await this.joinGroup(userId, groupId);

    return { message: 'City updated successfully', groupId };
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
