import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { aiCourseGenerationSchema } from '@/lib/validations/course.schema';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { DEFAULT_PROVIDER } from '@/services/ai/chat-provider.constants';

/**
 * Zod schema for course generation input.
 * Allows either a fileId (string) or a file (Blob/File).
 */
const courseGenerationInputSchema = z
  .object({
    fileId: z.string().uuid().optional(),
    file: z.any().optional(),
    apiKey: z.string().min(1).optional(),
  })
  .refine((data) => (data.fileId ? !data.file : !!data.file), {
    message: 'Provide exactly one: either fileId or a file',
    path: ['fileId', 'file'],
  });

/**
 * @swagger
 * /api/v1/ai/courses:
 *   get:
 *     tags:
 *       - AI Courses
 *     summary: Get AI course generation
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: AI course generation
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(
  withRoles(['TEACHER'], async (_request: Request) => {
    try {
      return NextResponse.json({});
    } catch (error) {
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  })
);

/**
 * @swagger
 * /api/v1/ai/courses:
 *   post:
 *     tags:
 *       - AI Courses
 *     summary: Create AI course generation
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fileId:
 *                 type: string
 *                 format: uuid
 *               file:
 *                 type: string
 *                 format: binary
 *               apiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI course generation
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export const POST = withAuth(
  withRoles(['TEACHER'], async (request: Request, sessionData) => {
    try {
      const userId = sessionData.user.id;

      let input: any;
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const fileId = formData.get('fileId') as string | null;
        const file = formData.get('file') as File | null;
        const apiKey = formData.get('apiKey') as string | null;

        input = {
          fileId: fileId || undefined,
          file: file || undefined,
          apiKey: apiKey || undefined,
        };
      } else {
        const body = await request.json();
        input = {
          fileId: body.fileId,
          apiKey: body.apiKey,
        };
      }

      const parsed = courseGenerationInputSchema.safeParse(input);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: parsed.error.format() },
          { status: 400 }
        );
      }

      // Check if file is PDF if provided
      if (parsed.data.file) {
        const file = parsed.data.file as File;
        if (file.type !== 'application/pdf') {
          return NextResponse.json(
            { error: 'Only PDF files are allowed' },
            { status: 400 }
          );
        }
      }
      // Instante AI service
      //   const aiService = new ChatProviderFactory('openrouter');

      const aiService = ChatProviderFactory.create('openrouter');
      // Generate the course structure from the provided content
      const result = await aiService.streamCourse({
        userId,
        fileId: parsed.data.fileId,
        file: parsed.data.file,
        apiKey: parsed.data.apiKey,
      });

      // Return the result as a data stream
      return result.toTextStreamResponse();
    } catch (error) {
      console.error('AI Course Generation Error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  })
);
