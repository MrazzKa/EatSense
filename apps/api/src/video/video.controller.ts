import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VideoService } from './video.service';

@UseGuards(JwtAuthGuard)
@Controller('video')
export class VideoController {
    constructor(private readonly videoService: VideoService) { }

    /**
     * Issue a LiveKit access token for the given conversation. Caller must be
     * the conversation's client or expert. Token TTL: 15 minutes.
     *
     * Mobile client: POST /video/token/:conversationId → { token, url, roomName, sessionId }.
     */
    @Post('token/:conversationId')
    async issueToken(@Param('conversationId') conversationId: string, @Req() req: any) {
        const userId = req.user?.userId || req.user?.id;
        // Expert role is resolved server-side from the conversation, this is just a hint.
        return this.videoService.issueToken({ userId, conversationId, isExpert: false });
    }

    @Post('session/:sessionId/started')
    async sessionStarted(@Param('sessionId') sessionId: string, @Req() req: any) {
        const userId = req.user?.userId || req.user?.id;
        return this.videoService.markStarted(sessionId, userId);
    }

    @Post('session/:sessionId/ended')
    async sessionEnded(
        @Param('sessionId') sessionId: string,
        @Body() body: { durationSec?: number },
        @Req() req: any,
    ) {
        const userId = req.user?.userId || req.user?.id;
        return this.videoService.markEnded(sessionId, body?.durationSec, userId);
    }

    /**
     * Expert-only: mute (or unmute) the client's microphone in the live call.
     * The client can still unmute themselves afterwards (standard LiveKit behavior).
     */
    @Post('session/:sessionId/mute-participant')
    async muteParticipant(
        @Param('sessionId') sessionId: string,
        @Body() body: { mute?: boolean },
        @Req() req: any,
    ) {
        const userId = req.user?.userId || req.user?.id;
        return this.videoService.muteOtherParticipant(sessionId, userId, body?.mute !== false);
    }
}
