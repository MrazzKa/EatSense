import { Injectable, ForbiddenException, NotFoundException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
// livekit-server-sdk is loaded lazily so the API boots even when the package
// is not yet installed (Phase 4 wiring lives behind LIVEKIT_API_KEY env).
type AccessTokenCtor = new (apiKey: string, apiSecret: string, opts: { identity: string; ttl?: string | number; name?: string }) => any;

@Injectable()
export class VideoService {
    private readonly logger = new Logger(VideoService.name);
    private accessTokenCtor: AccessTokenCtor | null = null;
    private grantTokenForRoom: any = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) { }

    private enabled(): boolean {
        return !!(
            this.config.get<string>('LIVEKIT_API_KEY') &&
            this.config.get<string>('LIVEKIT_API_SECRET') &&
            this.config.get<string>('LIVEKIT_URL')
        );
    }

    private async loadSdk() {
        if (this.accessTokenCtor) return;
        try {
            // Dynamic import keeps the dep optional until the package is added.
            const mod = await import('livekit-server-sdk' as any);
            this.accessTokenCtor = mod.AccessToken;
        } catch (err: any) {
            this.logger.warn(`livekit-server-sdk not installed: ${err?.message}. Run: pnpm --filter @eatsense/api add livekit-server-sdk`);
            throw new ServiceUnavailableException('Video module not installed on this build');
        }
    }

    /**
     * Mint a JWT for the given user to join the conversation's LiveKit room.
     * Authorization: caller must be either the conversation's client OR its expert.
     */
    async issueToken(params: { userId: string; conversationId: string; isExpert: boolean }) {
        if (!this.enabled()) {
            throw new ServiceUnavailableException('Video calls are not configured for this environment');
        }

        const conversation = await this.prisma.conversation.findUnique({
            where: { id: params.conversationId },
            include: { expert: true },
        });
        if (!conversation) throw new NotFoundException('Conversation not found');

        const isClient = conversation.clientId === params.userId;
        const isExpert = conversation.expert?.userId === params.userId;
        if (!isClient && !isExpert) {
            throw new ForbiddenException('You are not a participant of this conversation');
        }

        // Active session for this conversation? Reuse it so client + expert
        // join the same LiveKit room. Otherwise create a fresh one whose room
        // name embeds the session id (avoids reusing room names across calls).
        let session = await this.prisma.videoSession.findFirst({
            where: { conversationId: conversation.id, status: { in: ['scheduled', 'ringing', 'in_call'] } },
            orderBy: { createdAt: 'desc' },
        });
        if (!session) {
            session = await this.prisma.videoSession.create({
                data: {
                    conversationId: conversation.id,
                    // Temp placeholder; we patch after create so we can embed session.id.
                    roomName: `conv-${conversation.id}`,
                    status: 'ringing',
                },
            });
            const uniqueRoomName = `conv-${conversation.id}-${session.id}`;
            session = await this.prisma.videoSession.update({
                where: { id: session.id },
                data: { roomName: uniqueRoomName },
            });
        }
        const roomName = session.roomName;

        await this.loadSdk();
        const at = new (this.accessTokenCtor as AccessTokenCtor)(
            this.config.get<string>('LIVEKIT_API_KEY')!,
            this.config.get<string>('LIVEKIT_API_SECRET')!,
            {
                identity: params.userId,
                // Long enough to cover a 90-min consultation + buffer for late
                // join + reconnects. Tokens are short-lived secrets but a 15min
                // TTL was expiring mid-call.
                ttl: '2h',
                name: isExpert ? `Expert ${conversation.expert?.displayName || ''}`.trim() : 'Client',
            },
        );
        at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });
        const jwt: string = await at.toJwt();

        return {
            token: jwt,
            url: this.config.get<string>('LIVEKIT_URL'),
            roomName,
            sessionId: session.id,
            expiresIn: 7200,
        };
    }

    /** Returns the session if the user is a participant of the parent conversation. */
    private async assertSessionParticipant(sessionId: string, userId: string) {
        const session = await this.prisma.videoSession.findUnique({
            where: { id: sessionId },
            include: { conversation: { include: { expert: { select: { userId: true } } } } },
        });
        if (!session) throw new NotFoundException('Session not found');
        const isClient = session.conversation?.clientId === userId;
        const isExpert = session.conversation?.expert?.userId === userId;
        if (!isClient && !isExpert) {
            throw new ForbiddenException('You are not a participant of this session');
        }
        return session;
    }

    async markStarted(sessionId: string, userId: string) {
        const session = await this.assertSessionParticipant(sessionId, userId);
        // Preserve original startedAt across reconnects so duration math is correct.
        return this.prisma.videoSession.update({
            where: { id: sessionId },
            data: {
                status: 'in_call',
                startedAt: session.startedAt ?? new Date(),
            },
        });
    }

    async markEnded(sessionId: string, durationSec?: number, userId?: string) {
        if (userId) await this.assertSessionParticipant(sessionId, userId);
        return this.prisma.videoSession.update({
            where: { id: sessionId },
            data: {
                status: 'ended',
                endedAt: new Date(),
                durationSec: typeof durationSec === 'number' ? Math.max(0, Math.floor(durationSec)) : undefined,
            },
        });
    }
}
