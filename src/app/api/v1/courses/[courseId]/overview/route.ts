import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { CourseSettingsService } from '@/services/CourseSettingsService';
import {
  courseParamsSchema,
  mapCourseActionError,
} from '../course-route-utils';

const updateCourseOverviewSchema = z.object({
  capacity: z.number().int().min(1).nullable(),
  description: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional()
    .transform((value) => value || null),
  isPublished: z.boolean(),
  title: z.string().trim().min(1).max(255),
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/overview:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get course overview
 *     security:
 *       - SessionCookie: []
 */
export const GET = withAuth(async (_req, sessionData, { params }) => {
  try {
    const parsedParams = courseParamsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedParams.error.flatten() },
        { status: 400 }
      );
    }

    const overview = await CourseSettingsService.getSettings(
      parsedParams.data.courseId,
      sessionData.user.id
    );

    return NextResponse.json(overview);
  } catch (error) {
    return mapCourseActionError(error);
  }
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/overview:
 *   patch:
 *     tags:
 *       - Courses
 *     summary: Update course overview
 *     security:
 *       - SessionCookie: []
 */
export const PATCH = withAuth(async (req, sessionData, { params }) => {
  try {
    const parsedParams = courseParamsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedParams.error.flatten() },
        { status: 400 }
      );
    }

    const parsedBody = updateCourseOverviewSchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const updatedCourse = await CourseSettingsService.updateSettings({
      courseId: parsedParams.data.courseId,
      capacity: parsedBody.data.capacity,
      currentUserId: sessionData.user.id,
      description: parsedBody.data.description,
      isPublished: parsedBody.data.isPublished,
      title: parsedBody.data.title,
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    return mapCourseActionError(error);
  }
});
