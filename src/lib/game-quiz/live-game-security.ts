import { jwtVerify, SignJWT } from 'jose';
import {
  type LiveGameAudience,
  type LiveGameAvatarAccessClaims,
  type LiveGameTicketClaims,
  liveGameAvatarAccessClaimsSchema,
  liveGameTicketClaimsSchema,
} from './runtime-protocol';

const encoder = new TextEncoder();
const TICKET_ISSUER = 'eduflow-next';
const TICKET_AUDIENCE = 'eduflow-partykit';
const AVATAR_ACCESS_AUDIENCE = 'eduflow-live-game-avatar';
const AVATAR_ACCESS_TTL_SECONDS = 24 * 60 * 60;
const SERVICE_CLOCK_SKEW_MS = 60_000;

function secretBytes(secret: string) {
  if (secret.length < 32) {
    throw new Error('Live game secrets must contain at least 32 characters.');
  }
  return encoder.encode(secret);
}

function secretKey(secret: string, usages: KeyUsage[]) {
  return crypto.subtle.importKey(
    'raw',
    secretBytes(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    usages
  );
}

export async function issueLiveGameTicket(input: {
  audience: LiveGameAudience;
  role: string | null;
  secret: string;
  sessionId: string;
  userId: string;
}) {
  const now = Math.floor(Date.now() / 1_000);
  const expiresAt = now + 60;
  const token = await new SignJWT({
    audience: input.audience,
    role: input.role,
    sessionId: input.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.userId)
    .setIssuer(TICKET_ISSUER)
    .setAudience(TICKET_AUDIENCE)
    .setJti(crypto.randomUUID())
    .setIssuedAt(now)
    .setNotBefore(now - 5)
    .setExpirationTime(expiresAt)
    .sign(await secretKey(input.secret, ['sign']));

  return { token, expiresAt: new Date(expiresAt * 1_000).toISOString() };
}

export async function verifyLiveGameTicket(
  token: string,
  secret: string
): Promise<LiveGameTicketClaims> {
  const { payload } = await jwtVerify(
    token,
    await secretKey(secret, ['verify']),
    {
      algorithms: ['HS256'],
      audience: TICKET_AUDIENCE,
      issuer: TICKET_ISSUER,
    }
  );
  return liveGameTicketClaimsSchema.parse({
    ...payload,
    audience: payload.audience,
  });
}

export async function issueLiveGameAvatarAccessToken(input: {
  audience: LiveGameAudience;
  secret: string;
  sessionId: string;
  userId: string;
}) {
  const now = Math.floor(Date.now() / 1_000);
  const expiresAt = now + AVATAR_ACCESS_TTL_SECONDS;
  const token = await new SignJWT({
    audience: input.audience,
    sessionId: input.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.userId)
    .setIssuer(TICKET_ISSUER)
    .setAudience(AVATAR_ACCESS_AUDIENCE)
    .setJti(crypto.randomUUID())
    .setIssuedAt(now)
    .setNotBefore(now - 5)
    .setExpirationTime(expiresAt)
    .sign(await secretKey(input.secret, ['sign']));

  return { token, expiresAt: new Date(expiresAt * 1_000).toISOString() };
}

export async function verifyLiveGameAvatarAccessToken(
  token: string,
  secret: string
): Promise<LiveGameAvatarAccessClaims> {
  const { payload } = await jwtVerify(
    token,
    await secretKey(secret, ['verify']),
    {
      algorithms: ['HS256'],
      audience: AVATAR_ACCESS_AUDIENCE,
      issuer: TICKET_ISSUER,
    }
  );
  return liveGameAvatarAccessClaimsSchema.parse({
    ...payload,
    audience: payload.audience,
  });
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacHex(secret: string, value: string) {
  const key = await secretKey(secret, ['sign']);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(value)
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function canonicalServiceRequest(input: {
  bodyHash: string;
  direction: 'next-to-partykit' | 'partykit-to-next';
  method: string;
  pathname: string;
  requestId: string;
  timestamp: string;
}) {
  return [
    input.direction,
    input.method.toUpperCase(),
    input.pathname,
    input.timestamp,
    input.requestId,
    input.bodyHash,
  ].join('\n');
}

export async function signLiveGameServiceRequest(input: {
  body: string;
  direction: 'next-to-partykit' | 'partykit-to-next';
  method: string;
  pathname: string;
  requestId?: string;
  secret: string;
}) {
  const timestamp = String(Date.now());
  const requestId = input.requestId ?? crypto.randomUUID();
  const bodyHash = await sha256Hex(input.body);
  const signature = await hmacHex(
    input.secret,
    canonicalServiceRequest({
      bodyHash,
      direction: input.direction,
      method: input.method,
      pathname: input.pathname,
      requestId,
      timestamp,
    })
  );
  return {
    'Content-Type': 'application/json',
    'X-Eduflow-Direction': input.direction,
    'X-Eduflow-Request-Id': requestId,
    'X-Eduflow-Signature': signature,
    'X-Eduflow-Timestamp': timestamp,
  };
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function verifyLiveGameServiceRequest(input: {
  body: string;
  direction: 'next-to-partykit' | 'partykit-to-next';
  method: string;
  pathname: string;
  requestId: string | null;
  secret: string;
  signature: string | null;
  timestamp: string | null;
}) {
  const timestampNumber = Number(input.timestamp);
  if (
    !input.requestId ||
    !input.signature ||
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() - timestampNumber) > SERVICE_CLOCK_SKEW_MS
  ) {
    return false;
  }
  const expected = await hmacHex(
    input.secret,
    canonicalServiceRequest({
      bodyHash: await sha256Hex(input.body),
      direction: input.direction,
      method: input.method,
      pathname: input.pathname,
      requestId: input.requestId,
      timestamp: input.timestamp!,
    })
  );
  return constantTimeEqual(expected, input.signature);
}
