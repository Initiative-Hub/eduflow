import { TranslateClient } from '@aws-sdk/client-translate';
import { ensureEnv } from '@/utils/env-helper';

let translateClient: TranslateClient | null = null;

export const createTranslateClient = () => {
  if (translateClient) return translateClient;

  const region = ensureEnv('AWS_TRANSLATE_REGION');
  const accessKeyId = ensureEnv('AWS_TRANSLATE_ACCESS_KEY_ID');
  const secretAccessKey = ensureEnv('AWS_TRANSLATE_SECRET_ACCESS_KEY');

  translateClient = new TranslateClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return translateClient;
};
