import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client } from '../aws/s3-client';

const DEFAULT_READ_EXPIRES_SECONDS = 30 * 60;
export const STORAGE_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const FILE_INVENTORY_BUCKET_NAME = 'eduflow-inventory';

function sanitizeSegment(value: string) {
  return value
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 180);
}

export function buildInventoryObjectKey(
  userId: string,
  fileName: string,
  options?: {
    courseId?: string;
  }
) {
  const safeName = sanitizeSegment(fileName) || 'file';

  let basePrefix: string;
  if (options?.courseId) {
    basePrefix = `courses/${options.courseId}`;
  } else {
    basePrefix = `users/${userId}`;
  }

  return `${basePrefix}/${crypto.randomUUID()}-${safeName}`;
}

export async function getInventoryObjectMetadata(options: {
  objectKey: string;
}) {
  try {
    const command = new HeadObjectCommand({
      Bucket: FILE_INVENTORY_BUCKET_NAME,
      Key: options.objectKey,
    });

    const response = await createS3Client().send(command);
    return {
      exists: true,
      contentLength:
        typeof response.ContentLength === 'number'
          ? response.ContentLength
          : null,
    };
  } catch {
    return {
      exists: false,
      contentLength: null,
    };
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

  return uploadUrl;
}
