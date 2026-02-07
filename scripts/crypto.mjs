import crypto from 'node:crypto';

export const decryptSecret = (payload, secret) => {
  if (!payload) return '';
  if (!secret) return payload;

  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) return payload;

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const key = crypto.createHash('sha256').update(secret, 'utf8').digest();

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
};

export const encryptSecret = (value, secret) => {
  const key = crypto.createHash('sha256').update(secret, 'utf8').digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
};

import fs from 'node:fs';
import path from 'node:path';

const main = () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Use a fixed key file or env var, or a default for dev if not present (NOT RECOMMENDED for prod)
  // Ideally read from .env.local or expect env var
  const secret = process.env.TRANS_AES_SECRET;

  if (!secret) {
     if (command === 'keygen') {
        const key = crypto.randomBytes(32).toString('hex');
        console.log("Generated Key:", key);
        console.log("\nAdd this to your .env.local and GitHub Secrets (TRANS_AES_SECRET)");
        return;
     }
     console.error("Error: TRANS_AES_SECRET environment variable is not set.");
     process.exit(1);
  }

  if (command === 'encrypt') {
    const inputPath = args[1] || 'users.yaml';
    const outputPath = args[2] || 'users.enc';
    
    try {
        const content = fs.readFileSync(inputPath, 'utf8');
        const encrypted = encryptSecret(content, secret);
        fs.writeFileSync(outputPath, encrypted, 'utf8');
        console.log(`Encrypted ${inputPath} to ${outputPath}`);
    } catch (e) {
        console.error("Encryption failed:", e.message);
        process.exit(1);
    }
  } else if (command === 'decrypt') {
    const inputPath = args[1] || 'users.enc';
    
    try {
        const content = fs.readFileSync(inputPath, 'utf8');
        const decrypted = decryptSecret(content, secret);
        console.log(decrypted);
    } catch (e) {
        console.error("Decryption failed:", e.message);
        process.exit(1);
    }
  }
};

// Check if running directly
if (process.argv[1] === import.meta.filename || process.argv[1].endsWith('crypto.mjs')) {
    main();
}
