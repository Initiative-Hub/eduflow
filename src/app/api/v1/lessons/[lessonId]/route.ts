import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { LessonService } from '@/services/LessonService';
import { z } from 'zod';

const patchLessonSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
});

export const PATCH = withAuth([], async (req, sessionData, context: any) => {
  try {
    if (!sessionData) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const { lessonId } = await context.params;

    const body = await req.json();
    const parsed = patchLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    const updatedLesson = await LessonService.updateLesson(lessonId, userId, {
      title: parsed.data.title,
      content: parsed.data.content,
    });

    return NextResponse.json(updatedLesson);
  } catch (error: any) {
    console.error('Update lesson error:', error);
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: 'An internal error occurred while saving the lesson.' },
      { status: 500 }
    );
  }
});

export const GET = withAuth([], async (req, sessionData, context: any) => {
  try {
    if (!sessionData) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionData.user.id;
    
    const params = await context?.params;
    let lessonId = params?.lessonId;
    if (!lessonId) {
      const urlMatches = req.url.match(/\/lessons\/([^/?]+)/);
      lessonId = urlMatches ? urlMatches[1] : null;
    }

    if (!lessonId) {
      return NextResponse.json({ message: 'Missing lessonId' }, { status: 400 });
    }

    const lesson = await LessonService.getLessonById(lessonId, userId);
    return NextResponse.json(lesson);
  } catch (error: any) {
    console.error('Get lesson error:', error);
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message?.includes('not found')) {
      return NextResponse.json({ message: 'Lesson not found' }, { status: 404 });
    }
    return NextResponse.json(
      { message: 'An internal error occurred while fetching the lesson.' },
      { status: 500 }
    );
  }
});
