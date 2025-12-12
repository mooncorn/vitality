// JWT utilities for session management
import type { User } from '../durable-objects/types';

interface JWTPayload {
  sub: string; // user id
  email?: string;
  name: string;
  picture?: string;
  provider: 'google' | 'guest';
  iat: number;
  exp: number;
}

// Guest user info (simplified User without email requirement)
export interface GuestUser {
  id: string;
  name: string;
  picture?: string;
  provider: 'guest';
}

// Simple base64url encoding/decoding
function base64UrlEncode(data: string): string {
  return btoa(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(data: string): string {
  const padded = data + '='.repeat((4 - (data.length % 4)) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

// Create HMAC-SHA256 signature
async function createSignature(
  data: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

// Verify HMAC-SHA256 signature
async function verifySignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSig = await createSignature(data, secret);
  return signature === expectedSig;
}

export async function createSessionJwt(
  user: User,
  jwtSecret: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60 // 7 days
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    provider: user.provider,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await createSignature(data, jwtSecret);

  return `${data}.${signature}`;
}

export async function verifySessionJwt(
  token: string,
  jwtSecret: string
): Promise<User | GuestUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    // Verify signature
    const isValid = await verifySignature(data, signature, jwtSecret);
    if (!isValid) return null;

    // Decode payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    if (payload.provider === 'guest') {
      return {
        id: payload.sub,
        name: payload.name,
        provider: 'guest',
      };
    }

    return {
      id: payload.sub,
      email: payload.email!,
      name: payload.name,
      picture: payload.picture,
      provider: payload.provider,
    };
  } catch {
    return null;
  }
}

// Create a guest token for non-authenticated users
export async function createGuestJwt(
  guestId: string,
  displayName: string,
  jwtSecret: string,
  expiresInSeconds: number = 24 * 60 * 60 // 24 hours for guests
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JWTPayload = {
    sub: guestId,
    name: displayName,
    provider: 'guest',
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await createSignature(data, jwtSecret);

  return `${data}.${signature}`;
}
