/// <reference types="jest" />

import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as jose from 'jose';
import {
  AuthService,
  appleAllowedAudiences,
  isGoogleTokenForClients,
  sanitizeMagicLinkRedirect,
} from '../../auth/auth.service';
import { AiAssistantController } from '../../ai-assistant/ai-assistant.controller';
import { MediaService, isPublicMediaMimetype } from '../../media/media.service';

/**
 * Security regressions: token audience checks for Apple/Google sign-in, magic
 * link redirect allowlist, single-use magic links, the assistant acting only
 * as the JWT user, and documents staying off the public media route.
 */

const ENV_KEYS = [
  'APPLE_BUNDLE_ID',
  'APPLE_ADDITIONAL_AUDIENCES',
  'EXPERT_PORTAL_URL',
  'API_BASE_URL',
  'MAGIC_LINK_ALLOWED_ORIGINS',
  'NODE_ENV',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_IOS_CLIENT_ID',
  'GOOGLE_ANDROID_CLIENT_ID',
  'GOOGLE_WEB_CLIENT_ID',
];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  process.env.APPLE_BUNDLE_ID = 'ch.eatsense.app';
  delete process.env.APPLE_ADDITIONAL_AUDIENCES;
  process.env.EXPERT_PORTAL_URL = 'https://experts.eatsense.ch';
  process.env.API_BASE_URL = 'https://api.eatsense.ch';
  delete process.env.MAGIC_LINK_ALLOWED_ORIGINS;
  process.env.NODE_ENV = 'production';
  process.env.GOOGLE_IOS_CLIENT_ID = 'ios-client.apps.googleusercontent.com';
  process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client.apps.googleusercontent.com';
  process.env.GOOGLE_WEB_CLIENT_ID = 'web-client.apps.googleusercontent.com';
  delete process.env.GOOGLE_CLIENT_ID;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  jest.restoreAllMocks();
});

function makeAuthService(prismaOverrides: Record<string, any> = {}) {
  const prisma: any = {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-user', ...data })),
      update: jest.fn(),
    },
    userProfile: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    magicLink: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    refreshToken: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    ...prismaOverrides,
  };
  const jwt: any = { sign: jest.fn().mockReturnValue('signed.jwt') };
  const mailer: any = { sendMagicLinkEmail: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(prisma, jwt, {} as any, {} as any, mailer);
  return { service, prisma, mailer };
}

describe('magic link redirect allowlist', () => {
  it('accepts the expert portal callback', () => {
    expect(sanitizeMagicLinkRedirect('https://experts.eatsense.ch/auth/callback')).toBe(
      'https://experts.eatsense.ch/auth/callback',
    );
  });

  it.each([
    'https://evil.example/auth/callback',
    'https://experts.eatsense.ch.evil.example/auth/callback',
    'https://experts.eatsense.ch@evil.example/auth/callback',
    'http://experts.eatsense.ch/auth/callback',
    'javascript:alert(1)',
    '//evil.example/x',
    'not a url',
  ])('rejects %s', (url) => {
    expect(sanitizeMagicLinkRedirect(url)).toBeNull();
  });

  it('allows the local portal only outside production', () => {
    expect(sanitizeMagicLinkRedirect('http://localhost:3001/auth/callback')).toBeNull();
    process.env.NODE_ENV = 'development';
    expect(sanitizeMagicLinkRedirect('http://localhost:3001/auth/callback')).toBe(
      'http://localhost:3001/auth/callback',
    );
  });

  it('emails the default link instead of a foreign redirect', async () => {
    const { service, mailer } = makeAuthService();
    await (service as any).sendMagicLinkForUser({ id: 'u1', email: 'a@b.ch' }, 'https://evil.example/cb');
    const link: string = mailer.sendMagicLinkEmail.mock.calls[0][1];
    expect(link.startsWith('https://api.eatsense.ch/auth/magic-link?token=')).toBe(true);
  });

  it('falls back to the portal callback for expert links', async () => {
    const { service, mailer } = makeAuthService();
    await (service as any).sendMagicLinkForUser(
      { id: 'u1', email: 'a@b.ch' },
      'https://evil.example/cb',
      'https://experts.eatsense.ch/auth/callback',
    );
    const link: string = mailer.sendMagicLinkEmail.mock.calls[0][1];
    expect(link.startsWith('https://experts.eatsense.ch/auth/callback?token=')).toBe(true);
  });
});

describe('magic link consumption', () => {
  it('refuses a link another request already claimed', async () => {
    const { service, prisma } = makeAuthService();
    prisma.magicLink.findUnique.mockResolvedValue({
      id: 'ml1',
      used: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u1', email: 'a@b.ch' },
    });
    prisma.magicLink.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.consumeMagicLink('tok')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Apple sign-in audience', () => {
  let privateKey: jose.KeyLike;
  let jwks: jose.JWTVerifyGetKey;

  beforeAll(async () => {
    const pair = await jose.generateKeyPair('RS256');
    privateKey = pair.privateKey;
    const jwk = await jose.exportJWK(pair.publicKey);
    jwk.kid = 'test';
    jwk.alg = 'RS256';
    jwks = jose.createLocalJWKSet({ keys: [jwk] });
  });

  async function appleToken(claims: Record<string, unknown>, aud: string) {
    return new jose.SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer('https://appleid.apple.com')
      .setAudience(aud)
      .setSubject('apple-sub-1')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  }

  function withKeys(service: AuthService) {
    jest.spyOn(service as any, 'getApplePublicKeys').mockResolvedValue(jwks);
    jest.spyOn(service as any, 'generateTokens').mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
  }

  it('builds the allowlist from env', () => {
    process.env.APPLE_ADDITIONAL_AUDIENCES = 'ch.eatsense.web, ch.eatsense.app';
    expect(appleAllowedAudiences()).toEqual(['ch.eatsense.app', 'ch.eatsense.web']);
  });

  it('rejects a validly signed token issued to another app', async () => {
    const { service, prisma } = makeAuthService();
    withKeys(service);
    const identityToken = await appleToken({ email: 'x@y.ch', email_verified: 'true' }, 'com.other.app');
    await expect(service.signInWithApple({ identityToken, user: 'apple-sub-1' } as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('accepts a token for our bundle id', async () => {
    const { service } = makeAuthService();
    withKeys(service);
    const identityToken = await appleToken({ email: 'x@y.ch', email_verified: 'true' }, 'ch.eatsense.app');
    const res = await service.signInWithApple({ identityToken, user: 'apple-sub-1' } as any);
    expect(res.user.email).toBe('x@y.ch');
  });

  it('does not link an existing account through an unverified email', async () => {
    const { service, prisma } = makeAuthService();
    withKeys(service);
    prisma.user.findFirst.mockImplementation(({ where }: any) =>
      Promise.resolve(where.appleUserId ? null : { id: 'victim' }),
    );
    const identityToken = await appleToken({ email: 'victim@y.ch', email_verified: false }, 'ch.eatsense.app');
    await expect(service.signInWithApple({ identityToken, user: 'apple-sub-1' } as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('Google access-token audience', () => {
  it('matches aud or azp against our client ids', () => {
    const ids = ['ios-client.apps.googleusercontent.com'];
    expect(isGoogleTokenForClients({ aud: 'ios-client.apps.googleusercontent.com' }, ids)).toBe(true);
    expect(isGoogleTokenForClients({ aud: 'x', azp: 'ios-client.apps.googleusercontent.com' }, ids)).toBe(true);
    expect(isGoogleTokenForClients({ aud: 'other', azp: 'other' }, ids)).toBe(false);
    expect(isGoogleTokenForClients(null, ids)).toBe(false);
  });

  it('refuses an access token issued to a foreign client before reading userinfo', async () => {
    const { service, prisma } = makeAuthService();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ aud: 'someone-else.apps.googleusercontent.com', azp: 'someone-else' }),
    });
    jest.spyOn(global, 'fetch' as any).mockImplementation(fetchMock as any);
    await expect(service.signInWithGoogle({ accessToken: 'ya29.x' } as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('oauth2.googleapis.com/tokeninfo');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('AI assistant acts only as the JWT user', () => {
  function makeController() {
    const assistant: any = {
      getConversationHistory: jest.fn().mockResolvedValue([]),
      getGeneralQuestion: jest.fn().mockResolvedValue({}),
      getNutritionAdvice: jest.fn().mockResolvedValue({}),
      getTokenUsageStats: jest.fn().mockResolvedValue({}),
      getHealthCheck: jest.fn().mockResolvedValue({}),
    };
    const orchestrator: any = { resumeSession: jest.fn().mockResolvedValue(null) };
    return { controller: new AiAssistantController(assistant, orchestrator), assistant, orchestrator };
  }
  const req = { user: { id: 'me' } };

  it('ignores a userId sent by the client', async () => {
    const { controller, assistant } = makeController();
    await controller.getConversationHistory(req, '5');
    expect(assistant.getConversationHistory).toHaveBeenCalledWith('me', 5);

    await controller.getGeneralQuestion({ userId: 'victim', question: 'hello there' } as any, req);
    expect(assistant.getGeneralQuestion).toHaveBeenCalledWith('me', 'hello there', undefined);

    await controller.getNutritionAdvice({ userId: 'victim', question: 'protein?' } as any, req);
    expect(assistant.getNutritionAdvice.mock.calls[0][0]).toBe('me');
  });

  it('checks session ownership on read', async () => {
    const { controller, orchestrator } = makeController();
    await expect(controller.getSession(req, 'sess')).rejects.toBeInstanceOf(NotFoundException);
    expect(orchestrator.resumeSession).toHaveBeenCalledWith('sess', 'me');
  });

  it('refuses requests without an authenticated user', async () => {
    const { controller } = makeController();
    expect(() => controller.getConversationHistory({}, undefined)).toThrow(UnauthorizedException);
  });
});

describe('public media route', () => {
  it('serves images only', () => {
    expect(isPublicMediaMimetype('image/jpeg')).toBe(true);
    expect(isPublicMediaMimetype('application/pdf')).toBe(false);
    expect(isPublicMediaMimetype(null)).toBe(false);
  });

  it('hides PDF documents behind 404', async () => {
    const prisma: any = {
      media: { findUnique: jest.fn().mockResolvedValue({ id: 'm1', mimetype: 'application/pdf', data: Buffer.from('x'), size: 1 }) },
    };
    const service = new MediaService(prisma);
    const res: any = { set: jest.fn(), send: jest.fn(), redirect: jest.fn() };
    await expect(service.serveMedia('m1', res)).rejects.toBeInstanceOf(NotFoundException);
    expect(res.send).not.toHaveBeenCalled();
  });

  it("does not read another user's file for analysis", async () => {
    const prisma: any = {
      media: { findUnique: jest.fn().mockResolvedValue({ id: 'm1', userId: 'owner', mimetype: 'image/jpeg', data: Buffer.from('x') }) },
    };
    const service = new MediaService(prisma);
    await expect(service.getMediaAsBase64('m1', { ownerUserId: 'intruder' })).resolves.toBeNull();
    await expect(service.getMediaAsBase64('m1', { ownerUserId: 'owner' })).resolves.not.toBeNull();
  });
});
