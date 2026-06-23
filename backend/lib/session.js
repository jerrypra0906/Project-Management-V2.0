import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME } from './authConstants.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signUserToken(user) {
  const userIsAdmin = !!user.isAdmin;
  return jwt.sign(
    { sub: user.id, email: user.email || '', name: user.name || '', isAdmin: userIsAdmin },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: '/',
    sameSite: 'lax',
    secure: isProd,
    httpOnly: true,
  });
}
