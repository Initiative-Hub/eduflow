import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { ModuleService } from '@/services/ModuleService';
import { z } from 'zod';

export const GET = withAuth([], async (_req, sessionData, { params }) => {
  try {
    if (!sessionData) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const modules = await ModuleService.getModulesByCourse(resolvedParams.courseId);

    return NextResponse.json(modules);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
});

const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export const POST = withAuth([], async (req, sessionData, { params }) => {
  try {
    if (!sessionData) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const body = await req.json();
    const parsed = createModuleSchema.safeParse(body);

    if (!parsed.success) return NextResponse.json({ message: 'Invalid data' }, { status: 400 });

    const newModule = await ModuleService.createModule({
      courseId: resolvedParams.courseId,
      title: parsed.data.title,
    });

    return NextResponse.json(newModule, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
});