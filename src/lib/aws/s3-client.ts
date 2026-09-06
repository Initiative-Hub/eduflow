import { S3Client } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

export const createS3Client = () => {
  if (s3Client) {
    return s3Client;
  }

  const region =
    process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1';
  const accessKeyId =
    process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing AWS credentials. Please check AWS_S3_ACCESS_KEY_ID and AWS_S3_SECRET_ACCESS_KEY.'
    );
  }

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
