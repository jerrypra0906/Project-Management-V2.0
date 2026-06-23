import store from '../store.js';

export async function findUserByEmail(email) {
  const data = await store.read();
  const lower = String(email || '').toLowerCase();
  return (data.users || []).find(u => String(u.email || '').toLowerCase() === lower) || null;
}

export async function findUserByHubSub(hubSub) {
  if (!hubSub) return null;
  const data = await store.read();
  const sub = String(hubSub);
  return (data.users || []).find(u => String(u.hubSub || '') === sub) || null;
}
