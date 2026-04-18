import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { LessonService } from '@/services/LessonService';
import { z } from 'zod';

const patchLessonSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
});

export const PATCH = withAuth([], async (req, sessionData, { params }) => {
  try {
    if (!sessionData) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const { lessonId } = params;

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
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
