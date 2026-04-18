import { S3Client } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

const ensureEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
};

export const createS3Client = () => {
  if (s3Client) {
    return s3Client;
  }

  const region = ensureEnv('AWS_REGION');
  const accessKeyId = ensureEnv('AWS_ACCESS_KEY_ID');
  const secretAccessKey = ensureEnv('AWS_SECRET_ACCESS_KEY');
  const endpoint = ensureEnv('AWS_S3_ENDPOINT');

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
