/**
 * @swagger
 * /api/v1/infrastructure/languages:
 *   post:
 *     tags:
 *       - Infrastructure
 *     summary: Set preferred locale cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               locale:
 *                 type: string
 *                 example: en
 *     responses:
 *       200:
 *         description: Locale cookie set
 *       500:
 *         description: Invalid locale
 *   delete:
 *     tags:
 *       - Infrastructure
 *     summary: Clear preferred locale cookie
 *     responses:
 *       200:
 *         description: Locale cookie cleared
 */
import { cookies as c } from 'next/headers';
import { NextResponse } from 'next/server';
import { LOCALE_COOKIE_NAME } from '@/constants/common';
import { supportedLocales } from '@/i18n/routing';

export async function POST(req: Request) {
  const cookies = await c();
  const { locale } = await req.json();

  // Check if locale is provided
  if (!locale) {
    return NextResponse.json(
      { message: 'Locale is required' },
      { status: 500 }
    );
  }

  // Check if locale is supported
  if (!supportedLocales.includes(locale)) {
    return NextResponse.json(
      { message: 'Locale is not supported' },
      { status: 500 }
    );
  }

  cookies.set(LOCALE_COOKIE_NAME, locale);
  return NextResponse.json({ message: 'Success' });
}

export async function DELETE() {
  const cookies = await c();

  cookies.delete(LOCALE_COOKIE_NAME);
  return NextResponse.json({ message: 'Success' });
}
