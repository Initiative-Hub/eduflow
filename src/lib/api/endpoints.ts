import { PORT } from '@/constants/common';

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${PORT}`;
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || `http://localhost:${PORT}/api`;
