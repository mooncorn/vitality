// Google OAuth implementation with PKCE
import type { GoogleTokenResponse, GoogleUserInfo, OAuthState } from './types';
import type { User } from '../durable-objects/types';
import type { Env } from '../index';
import { createSessionJwt } from '../utils/jwt';

// Generate PKCE code verifier
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(String.fromCharCode(...array));
}

// Generate PKCE code challenge from verifier
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(hash)));
}

function base64UrlEncode(data: string): string {
  return btoa(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Start OAuth flow - redirects to Google
export async function handleGoogleStart(
  request: Request,
  env: Env
): Promise<Response> {
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const url = new URL(request.url);
  // Always use the request's origin for OAuth redirect (works for both local dev and production)
  const appUrl = `${url.protocol}//${url.host}`;

  // Store OAuth state in KV (5 minute TTL)
  const oauthState: OAuthState = {
    codeVerifier,
    redirectUri: `${appUrl}/auth/google/callback`,
    createdAt: Date.now(),
  };
  await env.AUTH_KV.put(`oauth:${state}`, JSON.stringify(oauthState), {
    expirationTtl: 300,
  });

  // Build Google OAuth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', oauthState.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'select_account');

  return Response.redirect(authUrl.toString(), 302);
}

// Handle OAuth callback from Google
export async function handleGoogleCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    return new Response(getErrorHtml(error), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!code || !state) {
    return new Response(getErrorHtml('Missing code or state'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Retrieve and validate state
  const storedState = await env.AUTH_KV.get(`oauth:${state}`);
  if (!storedState) {
    return new Response(getErrorHtml('Invalid or expired state'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Clean up used state
  await env.AUTH_KV.delete(`oauth:${state}`);

  const oauthState: OAuthState = JSON.parse(storedState);

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code,
      oauthState.codeVerifier,
      oauthState.redirectUri,
      env
    );

    // Get user info from Google
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);

    // Create or update user in KV
    const user = await upsertUser(userInfo, env);

    // Create session JWT
    const jwt = await createSessionJwt(user, env.JWT_SECRET);

    // Return HTML that posts message to opener and closes
    return new Response(getSuccessHtml(jwt, user), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    console.error('OAuth error:', err);
    return new Response(getErrorHtml('Authentication failed'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  env: Env
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return response.json();
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return response.json();
}

async function upsertUser(userInfo: GoogleUserInfo, env: Env): Promise<User> {
  const userId = `google:${userInfo.id}`;

  const user: User = {
    id: userId,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    provider: 'google',
  };

  // Store user in KV
  await env.USERS_KV.put(`user:${userId}`, JSON.stringify(user));

  return user;
}

function getSuccessHtml(jwt: string, user: User): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Authentication Successful</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #000;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .success { color: #4ade80; font-size: 3rem; }
    p { color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✓</div>
    <h1>Welcome, ${escapeHtml(user.name)}!</h1>
    <p>You can close this window.</p>
  </div>
  <script>
    (function() {
      const authData = {
        type: 'AUTH_SUCCESS',
        token: ${JSON.stringify(jwt)},
        user: ${JSON.stringify(user)}
      };

      if (window.opener) {
        window.opener.postMessage(authData, '*');
        setTimeout(() => window.close(), 1500);
      } else {
        // Fallback: store in localStorage and redirect
        localStorage.setItem('vitality-auth-pending', JSON.stringify(authData));
        window.location.href = '/';
      }
    })();
  </script>
</body>
</html>`;
}

function getErrorHtml(error: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Authentication Error</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #000;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .error { color: #f87171; font-size: 3rem; }
    p { color: #a1a1aa; }
    button {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error">✕</div>
    <h1>Authentication Failed</h1>
    <p>${escapeHtml(error)}</p>
    <button onclick="window.close()">Close</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'AUTH_ERROR', error: ${JSON.stringify(error)} }, '*');
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
