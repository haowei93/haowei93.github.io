import fs from 'node:fs/promises';
import path from 'node:path';
import { syncUser } from './sync_user.mjs';

const fetchSupabaseUsers = async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return [];

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/users?select=id,coros_account,coros_password_enc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status}`);
  }

  return response.json();
};

const readUsersFromFile = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

const loadUsers = async () => {
  const file = process.env.USERS_FILE;
  if (file) {
    return readUsersFromFile(path.resolve(file));
  }

  const json = process.env.USERS_JSON;
  if (json) {
    return JSON.parse(json);
  }

  return fetchSupabaseUsers();
};

const main = async () => {
  const users = await loadUsers();
  if (!Array.isArray(users) || users.length === 0) {
    console.log('No users to sync.');
    return;
  }

  const targetUser = process.env.USER_ID;
  const filtered = targetUser
    ? users.filter((user) => String(user.id) === String(targetUser))
    : users;

  if (!filtered.length) {
    console.log('No matching users to sync.');
    return;
  }

  for (const user of filtered) {
    const userId = user.id;
    const corosAccount = user.coros_account;
    const corosPasswordEnc = user.coros_password_enc;

    if (!userId || !corosAccount || !corosPasswordEnc) {
      console.warn(`Skip user ${userId}: missing credentials.`);
      continue;
    }

    console.log(`Syncing user ${userId}...`);
    await syncUser({
      userId: String(userId),
      corosAccount,
      corosPasswordEnc,
      fileType: process.env.FILE_TYPE ?? 'fit',
      onlyRun: process.env.ONLY_RUN === 'true',
    });
  }
};

await main();
