# Multi-user sync (Coros)

## Data layout
- `data/users/<id>/FIT_OUT/`
- `data/users/<id>/data.db`
- `public/users/<id>/activities.json`

## Encrypting passwords
Password encryption uses AES-256-GCM. Store encrypted values in `coros_password_enc`.

Example (local):
```bash
node -e "import { encryptSecret } from './scripts/crypto.mjs'; console.log(encryptSecret('plain-password', process.env.USER_PASSWORD_SECRET));"
```

## Local single-user sync
```bash
export USER_PASSWORD_SECRET=your-secret
export USER_ID=abc123
export COROS_ACCOUNT=account
export COROS_PASSWORD_ENC=encrypted_value
node scripts/sync_user.mjs
```

## Batch sync
```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export USER_PASSWORD_SECRET=...
node scripts/generate_all.mjs
```

## Registration API (Vercel)
`POST /api/register`

Payload:
```json
{\n  \"corosAccount\": \"your-account\",\n  \"corosPassword\": \"your-password\"\n}\n```

Response:
```json
{\n  \"id\": \"a1b2c3\"\n}\n```

Required env:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `USER_PASSWORD_SECRET`

## Manual sync from GitHub Actions
Run the `Multi-User Sync` workflow and pass `user_id` to only sync one user.
