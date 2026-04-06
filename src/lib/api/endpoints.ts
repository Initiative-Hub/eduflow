import { PORT, PROD_MODE } from '@/constants/common';

export const BASE_URL =
  process.env.BASE_URL ||
  (PROD_MODE ? 'https://edu-flow.me' : `http://localhost:${PORT}`);

export const API_URL =
  process.env.API_URL ||
  (PROD_MODE ? 'https://edu-flow.me/api' : `http://localhost:${PORT}/api`);
