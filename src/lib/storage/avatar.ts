import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DEFAULT_READ_EXPIRES_SECONDS = 30 * 60;
export const AVATAR_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;

type AvatarContentType = (typeof AVATAR_ALLOWED_CONTENT_TYPES)[number];

let s3Client: S3Client | null = null;

const ensureEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
};

const getS3Client = () => {
  if (s3Client) {
    return s3Client;
  }

  const region = ensureEnv('AWS_REGION');
  const accessKeyId = ensureEnv('AWS_ACCESS_KEY_ID');
  const secretAccessKey = ensureEnv('AWS_SECRET_ACCESS_KEY');
  const endpoint = process.env.AWS_S3_ENDPOINT;

  s3Client = new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3Client;
};

const getBucket = () => ensureEnv('AWS_S3_BUCKET_NAME');

const normalizeExtension = (extension: string) => {
  const trimmed = extension.trim().toLowerCase();
  if (!trimmed) {
    return 'jpg';
  }

  if (trimmed === 'jpeg') {
    return 'jpg';
  }

  return trimmed.replace(/[^a-z0-9]/g, '') || 'jpg';
};

const extensionFromMimeType = (contentType: AvatarContentType) => {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
};

const extensionFromFileName = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return null;
  }

  return normalizeExtension(fileName.slice(lastDotIndex + 1));
};

export const buildAvatarPrefix = (userId: string) => `users/${userId}/avatars/`;

export const buildAvatarObjectKey = ({
  userId,
  fileName,
  contentType,
}: {
  userId: string;
  fileName: string;
  contentType: AvatarContentType;
}) => {
  const extension =
    extensionFromFileName(fileName) ?? extensionFromMimeType(contentType);

  return `${buildAvatarPrefix(userId)}${crypto.randomUUID()}.${extension}`;
};

export const isAvatarKeyOwnedByUser = (userId: string, objectKey: string) => {
  return objectKey.startsWith(buildAvatarPrefix(userId));
};

export const createAvatarReadSignedUrl = async ({
  objectKey,
  expiresInSeconds = DEFAULT_READ_EXPIRES_SECONDS,
}: {
  objectKey: string;
  expiresInSeconds?: number;
}) => {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: objectKey,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: expiresInSeconds,
  });
};

export const uploadAvatarObject = async ({
  objectKey,
  contentType,
  body,
}: {
  objectKey: string;
  contentType: AvatarContentType;
  body: Uint8Array;
}) => {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: objectKey,
    ContentType: contentType,
    Body: body,
  });

  await getS3Client().send(command);
};

export const deleteAvatarObject = async (objectKey: string) => {
  const command = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: objectKey,
  });

  await getS3Client().send(command);
};
