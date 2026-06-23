import express from 'express';
import {
  exchangeCode,
  getOidcConfig,
  isOidcConfigured,
  verifyIdToken,
} from '../lib/oidc-hub.js';
import { hubSsoUpsert, HubSsoError } from '../services/hub-sso-upsert.js';
import { setAuthCookie, signUserToken } from '../lib/session.js';

const router = express.Router();

function appPublicOriginBase() {
  return String(getOidcConfig().appPublicOrigin).replace(/\/$/, '');
}

function renderErrorPage(title, message, status = 400) {
  const home = `${appPublicOriginBase()}/#auth`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head><body>
<h1>${title}</h1>
<p>${message}</p>
<p><a href="${home}">Go to login</a></p>
</body></html>`;
}

router.get('/oidc/callback', async (req, res) => {
  if (!isOidcConfigured()) {
    return res.status(503).send(renderErrorPage('SSO not configured', 'OIDC is not configured on this server.', 503));
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const codeVerifier =
    (typeof req.query.code_verifier === 'string' && req.query.code_verifier) ||
    (typeof req.query.codeVerifier === 'string' && req.query.codeVerifier) ||
    '';

  if (!code) {
    return res.status(400).send(renderErrorPage('Sign-in failed', 'Missing authorization code.'));
  }

  try {
    const tokenResponse = await exchangeCode({ code, codeVerifier });
    const claims = await verifyIdToken(tokenResponse.id_token);
    const { user } = await hubSsoUpsert(claims);

    const appToken = signUserToken(user);
    setAuthCookie(res, appToken);
    return res.redirect(302, `${appPublicOriginBase()}/`);
  } catch (err) {
    if (err instanceof HubSsoError) {
      const titles = {
        email_not_verified: 'Email verification required',
        invite_only: 'Access denied',
        domain: 'Access denied',
        inactive: 'Account inactive',
      };
      const title = titles[err.code] || 'Sign-in failed';
      return res.status(403).send(renderErrorPage(title, err.message));
    }
    console.error('[HUB_SSO] callback error:', err.message);
    return res.status(401).send(renderErrorPage('Sign-in failed', 'Could not complete Hub sign-in. Try again from the Hub dashboard.'));
  }
});

export default router;
