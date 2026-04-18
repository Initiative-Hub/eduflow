import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  extensionFromFileName,
  extensionFromMimeType,
} from '@/utils/file-helper';
import { createS3Client } from './s3-client';

const DEFAULT_READ_EXPIRES_SECONDS = 30 * 60;
const AVATAR_BUCKET_NAME = 'eduflow-avatars';

export const AVATAR_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;

type ImageContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export const buildAvatarPrefix = (userId: string) => `users/${userId}/avatars/`;

export const buildAvatarObjectKey = ({
  userId,
  fileName,
  contentType,
}: {
  userId: string;
  fileName: string;
  contentType: ImageContentType;
}) => {
  const extension =
    extensionFromFileName(fileName) ?? extensionFromMimeType(contentType);

  return `${buildAvatarPrefix(userId)}${crypto.randomUUID()}.${extension}`;
};

export const createAvatarReadSignedUrl = async ({
  objectKey,
  expiresInSeconds = DEFAULT_READ_EXPIRES_SECONDS,
}: {
  objectKey: string;
  expiresInSeconds?: number;
}) => {
  const command = new GetObjectCommand({
    Bucket: AVATAR_BUCKET_NAME,
    Key: objectKey,
  });

  return getSignedUrl(createS3Client(), command, {
    expiresIn: expiresInSeconds,
  });
};

export const uploadAvatarObject = async ({
  objectKey,
  contentType,
  body,
}: {
  objectKey: string;
  contentType: ImageContentType;
  body: Uint8Array;
}) => {
  const command = new PutObjectCommand({
    Bucket: AVATAR_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
    Body: body,
  });

  await createS3Client().send(command);
};

export const deleteAvatarObject = async (objectKey: string) => {
  const command = new DeleteObjectCommand({
    Bucket: AVATAR_BUCKET_NAME,
    Key: objectKey,
  });

  await createS3Client().send(command);
};
