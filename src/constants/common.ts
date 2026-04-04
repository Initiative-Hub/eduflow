import { APP_AUTH_PATHS } from './auth_paths';
import { APP_PUBLIC_PATHS } from './public_paths';

export const PORT = process.env.PORT || 3000;

export const DEV_MODE = process.env.NODE_ENV === 'development';
export const PROD_MODE = process.env.NODE_ENV === 'production';

export const LOCAL_MAILPIT_URL = 'http://localhost:8025';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export const PUBLIC_PATHS = APP_PUBLIC_PATHS;
export const AUTH_PATHS = APP_AUTH_PATHS;
