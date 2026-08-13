import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import type { TiptapDocument } from '@/utils/lesson-content';
import {
  getActiveAssignmentOrThrow,
  requireCoursePermission,
} from './assignment-access';

type CreateAssignmentInput = {
  courseId: string;
  userId: string;
  title: string;
  content: TiptapDocument;
  dueAt: Date | null;
  maxPoints: number;
};

type UpdateAssignmentInput = {
  title?: string;
  content?: TiptapDocument;
  dueAt?: Date | null;
  maxPoints?: number;
};

export class AssignmentCommandService {
  static async create(input: CreateAssignmentInput) {
    await requireCoursePermission(
      input.userId,
      input.courseId,
      COURSE_PERMISSION.ASSESSMENTS_CREATE
    );

    if (input.maxPoints <= 0) {
      throw new Error('Maximum points must be greater than zero');
    }

    return prisma.assignment.create({
      data: {
        courseId: input.courseId,
        createdById: input.userId,
        title: input.title.trim(),
        content: input.content,
        dueAt: input.dueAt,
        maxPoints: input.maxPoints,
      },
    });
  }

  static async update(
    assignmentId: string,
    userId: string,
    input: UpdateAssignmentInput
  ) {
    const assignment = await getActiveAssignmentOrThrow(assignmentId);

    await requireCoursePermission(
      userId,
      assignment.courseId,
      COURSE_PERMISSION.ASSESSMENTS_UPDATE
    );

    if (input.maxPoints !== undefined && input.maxPoints <= 0) {
      throw new Error('Maximum points must be greater than zero');
    }

    return prisma.assignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        title: input.title?.trim(),
        content: input.content,
        dueAt: input.dueAt,
        maxPoints: input.maxPoints,
      },
    });
  }

  static async delete(assignmentId: string, userId: string) {
    const assignment = await getActiveAssignmentOrThrow(assignmentId);

    await requireCoursePermission(
      userId,
      assignment.courseId,
      COURSE_PERMISSION.ASSESSMENTS_DELETE
    );

    return prisma.assignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: {
        id: true,
      },
    });
  }
}
