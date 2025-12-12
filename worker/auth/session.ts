// Session management utilities
import type { User } from '../durable-objects/types';
import type { Env } from '../index';
import { verifySessionJwt, type GuestUser } from '../utils/jwt';

export type AuthenticatedUser = User | GuestUser;

export async function getAuthenticatedUser(
  request: Request,
  env: Env
): Promise<User | null> {
  // Check Authorization header - only returns full User (not guests)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = await verifySessionJwt(token, env.JWT_SECRET);
    // Only return full User, not guests (for protected endpoints)
    if (user && user.provider !== 'guest') {
      return user as User;
    }
    return null;
  }

  // Check query parameter (for WebSocket connections)
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  if (tokenParam) {
    const user = await verifySessionJwt(tokenParam, env.JWT_SECRET);
    if (user && user.provider !== 'guest') {
      return user as User;
    }
    return null;
  }

  return null;
}

export function requireAuth(user: User | null): User {
  if (!user) {
    throw new AuthError('Unauthorized', 401);
  }
  return user;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
