import { S3Client } from '@aws-sdk/client-s3';
import { ensureEnv } from '@/utils/env-helper';

let s3Client: S3Client | null = null;

export const createS3Client = () => {
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
