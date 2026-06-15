import { PollyClient } from '@aws-sdk/client-polly';
import { ensureEnv } from '@/utils/env-helper';

let pollyClient: PollyClient | null = null;

export const createPollyClient = () => {
  if (pollyClient) return pollyClient;

  const region = ensureEnv('AWS_POLLY_REGION');
  const accessKeyId = ensureEnv('AWS_POLLY_ACCESS_KEY_ID');
  const secretAccessKey = ensureEnv('AWS_POLLY_SECRET_ACCESS_KEY');

  pollyClient = new PollyClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return pollyClient;
};
