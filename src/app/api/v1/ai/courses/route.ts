import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withRoles } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { CourseService } from '@/services/CourseService';

/**
 * Zod schema for course generation input.
 * Allows either a fileId (string) or a file (Blob/File).
 */
const courseGenerationInputSchema = z
  .object({
    fileId: z.string().uuid().optional(),
    file: z.any().optional(),
    apiKey: z.string().min(1).optional(),
    courseId: z.string().uuid(),
    context: z.string().max(2000).optional(),
    model: z.string().min(1).optional(),
  })
  .refine((data) => (data.fileId ? !data.file : !!data.file), {
    message: 'Provide exactly one: either fileId or a file',
    path: ['fileId', 'file'],
  });

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
 *               courseId:
 *                 type: string
 *                 format: uuid
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
export const POST = withRoles(
  ['TEACHER'],
  async (request: Request, sessionData) => {
    try {
      const userId = sessionData.user.id;

      let input: any;
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const courseId = formData.get('courseId') as string | null;
        const fileId = formData.get('fileId') as string | null;
        const file = formData.get('file') as File | null;
        const context = formData.get('context') as string | null;
        const apiKey = formData.get('apiKey') as string | null;
        const model = formData.get('model') as string | null;

        input = {
          courseId: courseId || undefined,
          fileId: fileId || undefined,
          file: file || undefined,
          context: context || undefined,
          apiKey: apiKey || undefined,
          model: model || undefined,
        };
      } else {
        const body = await request.json();
        input = {
          fileId: body.fileId,
          courseId: body.courseId,
          context: body.context,
          apiKey: body.apiKey,
          model: body.model,
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

      const permissions = await getCoursePermissions(
        userId,
        parsed.data.courseId
      );
      if (
        permissions.withoutPermission(
          COURSE_PERMISSION.COURSE_CONTENT_CREATE
        ) ||
        permissions.withoutPermission(
          COURSE_PERMISSION.AI_USE_COURSE_GENERATION
        )
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const result = CourseService.generateModulesStream({
        userId,
        courseId: parsed.data.courseId,
        fileId: parsed.data.fileId,
        file: parsed.data.file,
        context: parsed.data.context,
        apiKey: parsed.data.apiKey,
        model: parsed.data.model,
      });

      // Return the NDJSON stream
      return new Response(result as unknown as ReadableStream<Uint8Array>, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (error) {
      console.error('AI Course Generation Error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);
