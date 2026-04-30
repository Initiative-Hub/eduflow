import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Sign out the current session
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Signed out
 *
 */
export async function POST() {
  return auth.api.signOut({
    headers: await headers(),
    asResponse: true,
  });
}
