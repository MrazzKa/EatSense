import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT authentication guard.
 * Allows requests to proceed even without authentication,
 * but attaches user to request if valid JWT is provided.
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Return user if authenticated, or null if not
    // Don't throw error for missing/invalid token
    return user || null;
  }
}
