import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { syncCorosActivities } from './coros_sync.mjs';
import { decryptSecret } from './crypto.mjs';

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

export const syncUser = async ({
  userId,
  corosAccount,
  corosPasswordEnc,
  fileType = 'fit',
  onlyRun = false,
}) => {
  if (!userId) throw new Error('Missing userId');

  const baseDir = path.join(process.cwd(), 'data', 'users', userId);
  const dataDir = path.join(baseDir, `${fileType.toUpperCase()}_OUT`);
  const dbPath = path.join(baseDir, 'data.db');
  const publicDir = path.join(process.cwd(), 'public', 'users', userId);
  const jsonPath = path.join(publicDir, 'activities.json');

  await ensureDir(dataDir);
  await ensureDir(publicDir);

  const secret = process.env.USER_PASSWORD_SECRET ?? '';
  const password = decryptSecret(corosPasswordEnc, secret);

  if (!password) {
    throw new Error(`Missing coros password for user ${userId}`);
  }

  const result = await syncCorosActivities({
    account: corosAccount,
    password,
    onlyRun,
    fileType,
    outputDir: dataDir,
  });

  const python = process.env.PYTHON_BIN ?? 'python3';
  const args = [
    'run_page/make_activities.py',
    '--data-dir',
    dataDir,
    '--db',
    dbPath,
    '--json',
    jsonPath,
    '--file-suffix',
    fileType,
  ];

  const output = spawnSync(python, args, { stdio: 'inherit' });
  if (output.status !== 0) {
    throw new Error(`Python generator failed for user ${userId}`);
  }

  await fs.writeFile(
    path.join(publicDir, 'meta.json'),
    JSON.stringify({ userId, updatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );

  return result;
};

const readUserInput = async () => {
  const userId = process.env.USER_ID;
  const corosAccount = process.env.COROS_ACCOUNT;
  const corosPasswordEnc = process.env.COROS_PASSWORD_ENC;

  if (!userId || !corosAccount || !corosPasswordEnc) {
    throw new Error('USER_ID, COROS_ACCOUNT, COROS_PASSWORD_ENC are required');
  }

  return { userId, corosAccount, corosPasswordEnc };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const { userId, corosAccount, corosPasswordEnc } = await readUserInput();
  await syncUser({ userId, corosAccount, corosPasswordEnc });
}
