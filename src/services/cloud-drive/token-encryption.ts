import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const ENCRYPTION_PREFIX = 'v1';

function getEncryptionSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('Encryption secret is not configured.');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptCloudDriveToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionSecret(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  return [
    ENCRYPTION_PREFIX,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptCloudDriveToken(value: string, providerName: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(':');
  if (
    version !== ENCRYPTION_PREFIX ||
    !ivValue ||
    !tagValue ||
    !encryptedValue
  ) {
    throw new Error(`Stored ${providerName} token format is invalid.`);
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionSecret(),
    Buffer.from(ivValue, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
