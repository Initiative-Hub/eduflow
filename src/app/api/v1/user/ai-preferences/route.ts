import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { updateAiPreferencesSchema } from '@/lib/validations/ai-preferences.schema';
import { UserAiPreferencesService } from '@/services/UserAiPreferencesService';

/**
 * @swagger
 * /api/v1/user/ai-preferences:
 *   get:
 *     tags:
 *       - User
 *     summary: Get the current user's AI preferences
 *     description: Returns the custom instructions applied to AI generation for the authenticated user.
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: AI preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - customInstructions
 *               properties:
 *                 customInstructions:
 *                   type: string
 *                   description: Custom instructions applied to the user's AI generations.
 *                   example: Avoid using hyphenated lists in user-visible prose.
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(async (_request, session) => {
  const preference = await UserAiPreferencesService.get(session.user.id);
  return NextResponse.json(preference);
});

/**
 * @swagger
 * /api/v1/user/ai-preferences:
 *   patch:
 *     tags:
 *       - User
 *     summary: Update the current user's AI preferences
 *     description: Saves custom instructions that are applied to AI generation for the authenticated user. An empty string clears the instructions.
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - customInstructions
 *             properties:
 *               customInstructions:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Custom instructions to apply, or an empty string to clear them.
 *                 example: Avoid using hyphenated lists in user-visible prose.
 *     responses:
 *       200:
 *         description: AI preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - customInstructions
 *               properties:
 *                 customInstructions:
 *                   type: string
 *                   nullable: true
 *                   description: The saved custom instructions, or null when cleared.
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const PATCH = withAuth(async (request, session) => {
  const parsed = updateAiPreferencesSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: 'Invalid AI Preferences',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const preferences = await UserAiPreferencesService.update(
    session.user.id,
    parsed.data
  );

  return NextResponse.json(preferences);
});
