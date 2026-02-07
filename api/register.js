import crypto from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

const generateId = () => {
  let id = '';
  for (let i = 0; i < 6; i += 1) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
};

const encryptSecret = (value, secret) => {
  const key = crypto.createHash('sha256').update(secret, 'utf8').digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
};

const createUser = async ({ id, corosAccount, corosPasswordEnc }) => {
  const url = `${process.env.SUPABASE_URL?.replace(/\/$/, '')}/rest/v1/users`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: JSON.stringify({
      id,
      coros_account: corosAccount,
      coros_password_enc: corosPasswordEnc,
    }),
  });

  if (response.ok) {
    const data = await response.json();
    return data?.[0];
  }

  const text = await response.text();
  const error = new Error(text || `Supabase error: ${response.status}`);
  error.statusCode = response.status;
  throw error;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { corosAccount, corosPassword } = req.body ?? {};
  if (!corosAccount || !corosPassword) {
    res.status(400).json({ error: 'Missing Coros account or password.' });
    return;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'Server not configured.' });
    return;
  }

  const secret = process.env.USER_PASSWORD_SECRET ?? '';
  const encrypted = encryptSecret(String(corosPassword), secret);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = generateId();
    try {
      await createUser({ id, corosAccount, corosPasswordEnc: encrypted });
      res.status(200).json({ id });
      return;
    } catch (err) {
      const status = err?.statusCode ?? 500;
      if (status === 409 || String(err?.message ?? '').includes('duplicate')) {
        continue;
      }
      res.status(500).json({ error: err?.message ?? 'Failed to create user.' });
      return;
    }
  }

  res.status(500).json({ error: 'Failed to allocate user id.' });
}
