import { PORT, PROD_MODE } from '@/constants/common';

export const BASE_URL =
  process.env.BASE_URL ||
  (PROD_MODE ? 'https://eduflow.com' : `http://localhost:${PORT}`);

export const API_URL =
  process.env.API_URL ||
  (PROD_MODE ? 'https://eduflow.com/api' : `http://localhost:${PORT}/api`);
