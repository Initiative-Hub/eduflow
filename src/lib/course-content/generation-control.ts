import { randomUUID } from 'node:crypto';
import { getUpstashRestRedisClient } from '@/lib/upstash/redis/client';

const CONTROL_TTL_SECONDS = 15 * 60;
const controlKey = (controlId: string) =>
  `course-content-generation:${controlId}`;

export type CourseContentGenerationControl = {
  courseId: string;
  userId: string;
  skipSearch: boolean;
};

export async function createCourseContentGenerationControl({
  courseId,
  userId,
}: Pick<CourseContentGenerationControl, 'courseId' | 'userId'>) {
  const controlId = randomUUID();
  const control: CourseContentGenerationControl = {
    courseId,
    userId,
    skipSearch: false,
  };

  await getUpstashRestRedisClient().set(controlKey(controlId), control, {
    ex: CONTROL_TTL_SECONDS,
  });

  return controlId;
}

export async function getCourseContentGenerationControl(controlId: string) {
  return await getUpstashRestRedisClient().get<CourseContentGenerationControl>(
    controlKey(controlId)
  );
}

export async function requestCourseContentSearchSkip(controlId: string) {
  const redis = getUpstashRestRedisClient();
  const control = await redis.get<CourseContentGenerationControl>(
    controlKey(controlId)
  );

  if (!control) return null;

  const updatedControl = { ...control, skipSearch: true };
  await redis.set(controlKey(controlId), updatedControl, {
    ex: CONTROL_TTL_SECONDS,
  });

  return updatedControl;
}

export async function isCourseContentSearchSkipRequested(controlId: string) {
  const control = await getCourseContentGenerationControl(controlId);
  return control?.skipSearch === true;
}

export async function deleteCourseContentGenerationControl(controlId: string) {
  await getUpstashRestRedisClient().del(controlKey(controlId));
}
