/// <reference types="jest" />

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const subscriptionsGet = jest.fn();
const productsGet = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: jest.fn().mockImplementation(() => ({})) },
    androidpublisher: jest.fn(() => ({
      purchases: {
        subscriptions: { get: subscriptionsGet },
        products: { get: productsGet },
      },
    })),
  },
}));

import { CommunityService } from '../community/community.service';
import { SafetyService } from '../safety/safety.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsController } from '../subscriptions/subscriptions.controller';
import { resolveSuggestionLocale } from '../suggestions/suggestions.controller';
import { FridgeRecipesDto, normalizeExcludeTitles } from '../../food/dto/fridge-recipes.dto';

const VIEWER = 'viewer';
const GROUP = { id: 'group-ch', type: 'COUNTRY', country: 'CH' };

function communityPrisma(overrides: Record<string, any> = {}) {
  const prisma: any = {
    userProfile: {
      findUnique: jest.fn().mockResolvedValue({ country: 'CH', cityGroupId: GROUP.id }),
      update: jest.fn(),
    },
    communityGroup: { findFirst: jest.fn().mockResolvedValue(GROUP), upsert: jest.fn() },
    communityMembership: { deleteMany: jest.fn(), upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    communityPost: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
    },
    communityComment: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    communityLike: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null) },
    eventAttendee: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
    },
    userBlock: {
      findMany: jest.fn().mockResolvedValue([
        { blockerId: VIEWER, blockedId: 'blocked-by-me' },
        { blockerId: 'blocked-me', blockedId: VIEWER },
      ]),
    },
    user: { findUnique: jest.fn() },
    ...overrides,
  };
  return prisma;
}

describe('community: blocks are applied server-side', () => {
  it('excludes authors blocked in either direction from the feed, with one block query', async () => {
    const prisma = communityPrisma();
    const service = new CommunityService(prisma, {} as any);
    await service.getFeed(VIEWER, 1, 20);

    expect(prisma.userBlock.findMany).toHaveBeenCalledTimes(1);
    const where = prisma.communityPost.findMany.mock.calls[0][0].where;
    expect(where.authorId.notIn.sort()).toEqual(['blocked-by-me', 'blocked-me']);
    expect(prisma.communityPost.count.mock.calls[0][0].where).toBe(where);
  });

  it('filters group posts, best places and comments the same way', async () => {
    const prisma = communityPrisma({
      communityPost: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', groupId: GROUP.id }),
      },
    });
    const service = new CommunityService(prisma, {} as any);

    await service.getGroupPosts(VIEWER, GROUP.id, 1, 20);
    await service.getBestPlaces(VIEWER, 1, 20, undefined, 'Genève');
    await service.getComments(VIEWER, 'p1', 1, 20);

    const [groupWhere, placesWhere] = prisma.communityPost.findMany.mock.calls.map((c: any[]) => c[0].where);
    expect(groupWhere.authorId.notIn).toHaveLength(2);
    expect(placesWhere.authorId.notIn).toHaveLength(2);
    expect(placesWhere.AND).toBeDefined(); // city filter still applied
    expect(prisma.communityComment.findMany.mock.calls[0][0].where.authorId.notIn).toHaveLength(2);
  });

  it('adds no author filter when there are no blocks', async () => {
    const prisma = communityPrisma({ userBlock: { findMany: jest.fn().mockResolvedValue([]) } });
    const service = new CommunityService(prisma, {} as any);
    await service.getFeed(VIEWER, 1, 20);
    expect(prisma.communityPost.findMany.mock.calls[0][0].where.authorId).toBeUndefined();
  });

  it('hides a single post written by a blocked author', async () => {
    const prisma = communityPrisma({
      communityPost: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1', groupId: GROUP.id, authorId: 'blocked-me', type: 'TEXT', metadata: {},
        }),
      },
    });
    const service = new CommunityService(prisma, {} as any);
    await expect(service.getPost(VIEWER, 'p1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('community: attendance', () => {
  function serviceWithPost(type: string) {
    const prisma = communityPrisma({
      communityPost: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', groupId: GROUP.id, type }) },
    });
    return { prisma, service: new CommunityService(prisma, {} as any) };
  }

  it('lets a user join a CHALLENGE post', async () => {
    const { prisma, service } = serviceWithPost('CHALLENGE');
    await expect(service.toggleAttendance(VIEWER, 'p1')).resolves.toEqual({ attending: true });
    expect(prisma.eventAttendee.create).toHaveBeenCalled();
  });

  it('still rejects plain text posts', async () => {
    const { service } = serviceWithPost('TEXT');
    await expect(service.toggleAttendance(VIEWER, 'p1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('community: author mini-profile', () => {
  it('falls back to the country group when the user has no city group', async () => {
    const prisma = communityPrisma({
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u2', createdAt: new Date(), userProfile: null }) },
      communityPost: { count: jest.fn().mockResolvedValue(3) },
      communityMembership: {
        findMany: jest.fn().mockResolvedValue([{ group: { name: 'Community CH', type: 'COUNTRY' } }]),
      },
    });
    const service = new CommunityService(prisma, {} as any);
    const profile = await service.getUserProfile('u2', VIEWER);
    expect(profile.cityGroup).toBe('Community CH');
  });
});

describe('safety: abuse reports', () => {
  it('accepts the legacy RN payload without category', async () => {
    const create = jest.fn().mockImplementation(({ data }) => ({ id: 'r1', ...data }));
    const service = new SafetyService({ abuseReport: { create } } as any);

    await service.createAbuseReport('reporter', { conversationId: 'c1' } as any);
    expect(create.mock.calls[0][0].data.category).toBe('other');

    await service.createAbuseReport('reporter', { reason: 'spam', reportedId: 'u9' } as any);
    expect(create.mock.calls[1][0].data).toMatchObject({ category: 'spam', reportedUserId: 'u9' });

    await service.createAbuseReport('reporter', { category: 'harassment', reason: 'spam' });
    expect(create.mock.calls[2][0].data.category).toBe('harassment');
  });
});

describe('notifications: ticket errors', () => {
  it('disables a token only for DeviceNotRegistered', async () => {
    const updateMany = jest.fn();
    const service = new NotificationsService({ pushToken: { updateMany } } as any);
    await (service as any).handleTicketErrors(
      ['t-gone', 't-creds', 't-big', 't-ok'],
      [
        { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
        { status: 'error', message: 'creds', details: { error: 'InvalidCredentials' } },
        { status: 'error', message: 'big', details: { error: 'MessageTooBig' } },
        { status: 'ok', id: 'x' },
      ],
    );
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({ where: { token: 't-gone' }, data: { enabled: false } });
  });
});

describe('subscriptions: Android verify-purchase', () => {
  const user = { id: 'u1' };
  let createSubscription: jest.Mock;
  let controller: SubscriptionsController;

  beforeEach(() => {
    subscriptionsGet.mockReset();
    productsGet.mockReset();
    createSubscription = jest.fn().mockResolvedValue({ id: 's1', endDate: new Date() });
    controller = new SubscriptionsController({ createSubscription } as any, {} as any, {} as any);
  });

  it('uses `receipt` as the purchase token (RN payload)', async () => {
    subscriptionsGet.mockResolvedValue({ data: { expiryTimeMillis: String(Date.now() + 86400000), paymentState: 1 } });
    const res = await controller.verifyPurchase(user, {
      productId: 'eatsense.pro.monthly', platform: 'android', receipt: 'play-token', transactionId: 'GPA.1',
    });
    expect(res.success).toBe(true);
    expect(subscriptionsGet.mock.calls[0][0]).toMatchObject({ subscriptionId: 'eatsense.pro.monthly', token: 'play-token' });
    expect(createSubscription.mock.calls[0][4]).toEqual({ googlePurchaseToken: 'play-token' });
  });

  it('prefers an explicit purchaseToken and works without receipt', async () => {
    subscriptionsGet.mockResolvedValue({ data: { expiryTimeMillis: String(Date.now() + 86400000) } });
    await controller.verifyPurchase(user, {
      productId: 'eatsense.pro.yearly', platform: 'android', purchaseToken: 'explicit', receipt: 'other',
    });
    expect(subscriptionsGet.mock.calls[0][0].token).toBe('explicit');
  });

  it('verifies the founders pass as a one-time product', async () => {
    productsGet.mockResolvedValue({ data: { purchaseState: 0 } });
    await controller.verifyPurchase(user, { productId: 'eatsense.founder.pass', platform: 'android', receipt: 'tok' });
    expect(productsGet).toHaveBeenCalled();
    expect(subscriptionsGet).not.toHaveBeenCalled();
  });

  it('rejects an expired subscription without creating one', async () => {
    subscriptionsGet.mockResolvedValue({ data: { expiryTimeMillis: String(Date.now() - 1000) } });
    await expect(controller.verifyPurchase(user, {
      productId: 'eatsense.pro.monthly', platform: 'android', receipt: 'tok',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(createSubscription).not.toHaveBeenCalled();
  });

  it('still requires some token', async () => {
    await expect(controller.verifyPurchase(user, { productId: 'eatsense.pro.monthly', platform: 'android' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('suggestions: locale', () => {
  it('maps every app locale to one with content', () => {
    expect(resolveSuggestionLocale('ru')).toBe('ru');
    expect(resolveSuggestionLocale('kk-KZ')).toBe('kk');
    expect(resolveSuggestionLocale('fr')).toBe('en');
    expect(resolveSuggestionLocale('de')).toBe('en');
    expect(resolveSuggestionLocale('es')).toBe('en');
    expect(resolveSuggestionLocale('')).toBeNull();
    expect(resolveSuggestionLocale(undefined)).toBeNull();
  });
});

describe('fridge: more recipes exclude list', () => {
  it('keeps the last 20 titles instead of rejecting a longer list', async () => {
    const titles = Array.from({ length: 35 }, (_, i) => `Dish ${i}`);
    const dto = plainToInstance(FridgeRecipesDto, { ingredients: ['egg'], excludeTitles: titles });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.excludeTitles).toHaveLength(20);
    expect(dto.excludeTitles![0]).toBe('Dish 15');
    expect(dto.excludeTitles![19]).toBe('Dish 34');
  });

  it('drops non-string entries', () => {
    expect(normalizeExcludeTitles(['a', 1, null, ' b '])).toEqual(['a', 'b']);
    expect(normalizeExcludeTitles(undefined)).toBeUndefined();
  });
});
