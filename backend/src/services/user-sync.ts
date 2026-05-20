import { db } from './db.js';

export async function upsertUser(authId: string, email: string, name: string) {
  return db.user.upsertByAuthId({ authId, email, name });
}

export async function getUserByAuthId(authId: string) {
  return db.user.findByAuthId(authId);
}
