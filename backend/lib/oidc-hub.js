import { createRemoteJWKSet, jwtVerify } from 'jose';

const issuer = () => String(process.env.OIDC_ISSUER || '').replace(/\/$/, '');
const clientId = () => process.env.OIDC_CLIENT_ID || '';
const redirectUri = () => process.env.OIDC_REDIRECT_URI || '';

let jwks;
function getJwks() {
  const iss = issuer();
  if (!iss) return null;
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${iss}/api/sso/jwks`));
  }
  return jwks;
}

export function getOidcConfig() {
  return {
    issuer: issuer(),
    clientId: clientId(),
    redirectUri: redirectUri(),
    appPublicOrigin:
      process.env.APP_PUBLIC_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8080',
  };
}

export function isOidcConfigured() {
  const { issuer: iss, clientId: cid, redirectUri: uri } = getOidcConfig();
  return Boolean(iss && cid && uri);
}

export async function exchangeCode({ code, codeVerifier }) {
  const { issuer: iss, clientId: cid, redirectUri: uri } = getOidcConfig();
  if (!iss || !cid || !uri) {
    throw new Error('OIDC not configured');
  }
  if (!codeVerifier) {
    throw new Error('Missing PKCE code_verifier');
  }

  const res = await fetch(`${iss}/api/sso/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: uri,
      client_id: cid,
      code_verifier: codeVerifier,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error_description || body.error || res.statusText;
    throw new Error(`Token exchange failed: ${msg}`);
  }
  if (!body.id_token) {
    throw new Error('Token response missing id_token');
  }
  return body;
}

export async function verifyIdToken(idToken) {
  const { issuer: iss, clientId: cid } = getOidcConfig();
  const keys = getJwks();
  if (!iss || !cid || !keys) {
    throw new Error('OIDC not configured');
  }

  const { payload } = await jwtVerify(idToken, keys, {
    issuer: iss,
    audience: cid,
  });

  if (!payload.sub) {
    throw new Error('Missing sub claim');
  }
  if (payload.email_verified !== true) {
    throw new Error('Email not verified for SSO');
  }

  return payload;
}
