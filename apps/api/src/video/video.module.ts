import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma.module';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

/**
 * LiveKit-backed video consultation module.
 *
 * Token issuance, room lifecycle (create/join/end), persistent VideoSession row.
 * Disabled gracefully when LIVEKIT_API_KEY/LIVEKIT_API_SECRET/LIVEKIT_URL envs
 * are missing — endpoints return 503 with a clear "video unavailable" body so
 * the mobile app can render the appropriate empty-state UI.
 */
@Module({
    imports: [PrismaModule],
    controllers: [VideoController],
    providers: [VideoService],
    exports: [VideoService],
})
export class VideoModule { }
