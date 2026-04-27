import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client } from './s3-client';

const DEFAULT_READ_EXPIRES_SECONDS = 30 * 60;

export const FILE_INVENTORY_BUCKET_NAME = 'eduflow-inventory';

function sanitizeSegment(value: string) {
  return value
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 180);
}

function normalizeRelativePath(value?: string) {
  if (!value) {
    return '';
  }

  return value
    .split('/')
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join('/');
}

export function buildInventoryObjectKey(
  userId: string,
  fileName: string,
  options?: {
    relativePath?: string;
  }
) {
  const safeName = sanitizeSegment(fileName) || 'file';
  const safePath = normalizeRelativePath(options?.relativePath);
  const basePrefix = safePath
    ? `users/${userId}/${safePath}`
    : `users/${userId}`;

  return `${basePrefix}/${randomUUID()}-${safeName}`;
}

export async function checkInventoryObjectExists(options: {
  objectKey: string;
}) {
  try {
    const command = new HeadObjectCommand({
      Bucket: FILE_INVENTORY_BUCKET_NAME,
      Key: options.objectKey,
    });

    await createS3Client().send(command);
    return true;
  } catch {
    return false;
  }
}

export async function uploadInventoryObject(options: {
  objectKey: string;
  contentType: string;
  body: Uint8Array;
}) {
  const command = new PutObjectCommand({
    Bucket: FILE_INVENTORY_BUCKET_NAME,
    Key: options.objectKey,
    ContentType: options.contentType,
    Body: options.body,
  });

  await createS3Client().send(command);
}

export async function downloadInventoryObject(options: { objectKey: string }) {
  const command = new GetObjectCommand({
    Bucket: FILE_INVENTORY_BUCKET_NAME,
    Key: options.objectKey,
  });

  const response = await createS3Client().send(command);
  if (!response.Body) {
    throw new Error('Object body is empty');
  }

  return {
    bytes: await response.Body.transformToByteArray(),
    contentType: response.ContentType || 'application/octet-stream',
  };
}

export async function deleteInventoryObject(options: { objectKey: string }) {
  const command = new DeleteObjectCommand({
    Bucket: FILE_INVENTORY_BUCKET_NAME,
    Key: options.objectKey,
  });

  await createS3Client().send(command);
}

export async function createInventoryReadSignedUrl(options: {
  objectKey: string;
  expiresInSeconds?: number;
}) {
  const command = new GetObjectCommand({
    Bucket: FILE_INVENTORY_BUCKET_NAME,
    Key: options.objectKey,
  });

  return getSignedUrl(createS3Client(), command, {
    expiresIn: options.expiresInSeconds ?? DEFAULT_READ_EXPIRES_SECONDS,
  });
}

export async function createInventoryWriteSignedUrl(options: {
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: FILE_INVENTORY_BUCKET_NAME,
    Key: options.objectKey,
    ContentType: options.contentType,
  });

  const uploadUrl = await getSignedUrl(createS3Client(), command, {
    expiresIn: options.expiresInSeconds ?? DEFAULT_READ_EXPIRES_SECONDS,
  });

  return {
    uploadUrl,
    headers: {
      'content-type': options.contentType,
    },
  };
}
