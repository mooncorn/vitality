// Cloudflare Worker entry point - Signaling server for WebRTC P2P
import { handleGoogleStart, handleGoogleCallback } from './auth/oauth';
import { getAuthenticatedUser, AuthError } from './auth/session';
import { generateLobbyCode, isValidLobbyCode, normalizeLobbyCode } from './utils/code-generator';
import { verifySessionJwt, createGuestJwt } from './utils/jwt';

// Re-export Durable Object class
export { LobbySession } from './durable-objects/LobbySession';

// Environment bindings
export interface Env {
  // Durable Objects
  LOBBY: DurableObjectNamespace;

  // KV Namespaces
  AUTH_KV: KVNamespace;
  USERS_KV: KVNamespace;

  // Secrets (set via wrangler secret put)
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;

  // Config
  APP_URL?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Auth routes
      if (path === '/auth/google/start') {
        return handleGoogleStart(request, env);
      }

      if (path === '/auth/google/callback') {
        return handleGoogleCallback(request, env);
      }

      // Get current user
      if (path === '/api/auth/me') {
        const user = await getAuthenticatedUser(request, env);
        if (!user) {
          return jsonResponse({ user: null });
        }
        return jsonResponse({ user });
      }

      // Create lobby (requires auth) - signaling only, no game state
      if (path === '/api/lobby/create' && request.method === 'POST') {
        const user = await getAuthenticatedUser(request, env);
        if (!user) {
          return errorResponse('Unauthorized', 401);
        }

        // Check for existing hosted lobby and close it
        const existingLobbyRecord = await env.USERS_KV.get(`host_lobby:${user.id}`);
        if (existingLobbyRecord) {
          try {
            const record = JSON.parse(existingLobbyRecord) as { lobbyCode: string; createdAt: number };

            // Close the existing lobby
            const existingLobbyId = env.LOBBY.idFromName(record.lobbyCode);
            const existingLobbyStub = env.LOBBY.get(existingLobbyId);

            await existingLobbyStub.fetch(new Request('https://internal/close', {
              method: 'POST',
              body: JSON.stringify({ reason: 'Host started new session' }),
            }));
          } catch (err) {
            // Log but don't fail - the old lobby may already be gone
            console.error('Failed to close existing lobby:', err);
          }

          // Delete the old record regardless of close success
          await env.USERS_KV.delete(`host_lobby:${user.id}`);
        }

        // Generate unique lobby code
        const lobbyCode = generateLobbyCode();

        // Create Durable Object for signaling
        const lobbyId = env.LOBBY.idFromName(lobbyCode);
        const lobbyStub = env.LOBBY.get(lobbyId);

        // Initialize lobby with host ID only (no game state)
        await lobbyStub.fetch(new Request('https://internal/init', {
          method: 'POST',
          body: JSON.stringify({
            lobbyCode,
            hostId: user.id,
          }),
        }));

        // Store the host -> lobby mapping with 24h TTL
        await env.USERS_KV.put(
          `host_lobby:${user.id}`,
          JSON.stringify({ lobbyCode, createdAt: Date.now() }),
          { expirationTtl: 86400 } // 24 hours
        );

        return jsonResponse({ lobbyCode });
      }

      // Guest join lobby (no auth required) - get a guest token
      if (path === '/api/lobby/join' && request.method === 'POST') {
        const body = await request.json().catch(() => ({})) as { code?: string; displayName?: string };

        if (!body.code) {
          return errorResponse('Missing code');
        }

        if (!isValidLobbyCode(body.code)) {
          return errorResponse('Invalid lobby code');
        }

        // displayName is optional, default to 'Player'
        const displayName = body.displayName?.trim().slice(0, 20) || 'Player';

        // Check if lobby exists
        const normalizedCode = normalizeLobbyCode(body.code);
        const lobbyId = env.LOBBY.idFromName(normalizedCode);
        const lobbyStub = env.LOBBY.get(lobbyId);

        const infoResponse = await lobbyStub.fetch(new Request('https://internal/info'));
        if (!infoResponse.ok) {
          return errorResponse('Lobby not found', 404);
        }

        // Generate guest ID and token
        const guestId = `guest:${crypto.randomUUID()}`;
        const token = await createGuestJwt(guestId, displayName, env.JWT_SECRET);

        return jsonResponse({ token, guestId, displayName });
      }

      // Get lobby info
      if (path.startsWith('/api/lobby/') && request.method === 'GET') {
        const code = path.split('/').pop();
        if (!code || !isValidLobbyCode(code)) {
          return errorResponse('Invalid lobby code');
        }

        const normalizedCode = normalizeLobbyCode(code);
        const lobbyId = env.LOBBY.idFromName(normalizedCode);
        const lobbyStub = env.LOBBY.get(lobbyId);

        const response = await lobbyStub.fetch(new Request('https://internal/info'));
        if (!response.ok) {
          return errorResponse('Lobby not found', 404);
        }

        const info = await response.json();
        return jsonResponse(info);
      }

      // WebSocket connection for signaling
      if (path.startsWith('/ws/lobby/')) {
        const code = path.split('/').pop();
        if (!code || !isValidLobbyCode(code)) {
          return errorResponse('Invalid lobby code');
        }

        // Verify token
        const token = url.searchParams.get('token');
        if (!token) {
          return errorResponse('Missing token', 401);
        }

        const user = await verifySessionJwt(token, env.JWT_SECRET);
        if (!user) {
          return errorResponse('Invalid token', 401);
        }

        const normalizedCode = normalizeLobbyCode(code);
        const lobbyId = env.LOBBY.idFromName(normalizedCode);
        const lobbyStub = env.LOBBY.get(lobbyId);

        // Forward WebSocket request to Durable Object with peer info
        const wsUrl = new URL(request.url);
        wsUrl.searchParams.set('odPeerId', user.id);
        wsUrl.searchParams.set('peerName', user.name);
        if ('picture' in user && user.picture) {
          wsUrl.searchParams.set('peerPicture', user.picture);
        }

        return lobbyStub.fetch(new Request(wsUrl.toString(), request));
      }

      // For all other routes, serve the SPA (let the React router handle it)
      return fetch(new URL('/index.html', request.url).toString(), request);

    } catch (err) {
      console.error('Worker error:', err);

      if (err instanceof AuthError) {
        return errorResponse(err.message, err.status);
      }

      return errorResponse('Internal server error', 500);
    }
  },
};
