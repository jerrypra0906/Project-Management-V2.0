import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import store from '../store.js';
import { isEmailDomainAllowed } from './email.js';

export class HubSsoError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function auditLog(action, hubSub, email, extra = '') {
  const ts = new Date().toISOString();
  console.log(`[HUB_SSO] ${ts} action=${action} sub=${hubSub} email=${email || '-'} ${extra}`.trim());
}

export async function hubSsoUpsert(claims) {
  const hubSub = String(claims.sub || '');
  const email = normalizeEmail(claims.email);
  const name =
    typeof claims.name === 'string' && claims.name.trim()
      ? claims.name.trim()
      : email || 'User';

  if (!hubSub) {
    auditLog('rejected', '-', email, 'reason=missing_sub');
    throw new HubSsoError('missing_sub', 'Invalid identity token');
  }
  if (claims.email_verified !== true) {
    auditLog('rejected', hubSub, email, 'reason=email_not_verified');
    throw new HubSsoError(
      'email_not_verified',
      'Your Hub email is not verified yet. Complete Hub SSO verification, then try again.'
    );
  }

  const jitEnabled = process.env.SSO_JIT !== 'false';
  const data = await store.read();
  const users = data.users || [];

  let user = users.find(u => String(u.hubSub || '') === hubSub);
  if (user) {
    if (!user.active) {
      auditLog('rejected', hubSub, email, 'reason=inactive');
      throw new HubSsoError('inactive', 'Account is inactive');
    }
    auditLog('login', hubSub, user.email || email);
    return { user, action: 'login' };
  }

  if (email) {
    user = users.find(u => normalizeEmail(u.email) === email);
    if (user) {
      if (!user.active) {
        auditLog('rejected', hubSub, email, 'reason=inactive');
        throw new HubSsoError('inactive', 'Account is inactive');
      }
      if (!isEmailDomainAllowed(email)) {
        auditLog('rejected', hubSub, email, 'reason=domain');
        throw new HubSsoError('domain', 'Email domain is not allowed for this application');
      }
      user.hubSub = hubSub;
      user.authSource = 'hub';
      user.emailActivated = true;
      await store.write(data);
      auditLog('link', hubSub, email);
      return { user, action: 'link' };
    }
  }

  if (!jitEnabled) {
    auditLog('rejected', hubSub, email, 'reason=invite_only');
    throw new HubSsoError(
      'invite_only',
      'No account exists for this email. Contact an administrator.'
    );
  }

  if (!email || !isEmailDomainAllowed(email)) {
    auditLog('rejected', hubSub, email, 'reason=domain');
    throw new HubSsoError('domain', 'Email domain is not allowed for this application');
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const id = crypto.randomUUID();
  user = {
    id,
    name,
    email,
    role: 'User',
    departmentId: null,
    active: true,
    passwordHash,
    isAdmin: false,
    emailActivated: true,
    activationToken: null,
    activationTokenExpiry: null,
    resetToken: null,
    resetTokenExpiry: null,
    type: null,
    teamMemberIds: [],
    hubSub,
    authSource: 'hub',
  };
  users.push(user);
  data.users = users;
  await store.write(data);
  auditLog('jit', hubSub, email);
  return { user, action: 'jit' };
}
