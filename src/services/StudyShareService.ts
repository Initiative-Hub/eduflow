import { ShareResourceType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { studyInteractiveContentSchema } from '@/utils/study-interactive-content';

export class StudyShareService {
  static async getPublicInteractiveContent(shareId: string) {
    const sharedResource = await prisma.sharedResource.findFirst({
      where: {
        id: shareId,
        resourceType: ShareResourceType.STUDY_INTERACTIVE_CONTENT,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        payload: true,
      },
    });

    if (!sharedResource) return null;

    const parsedPayload = studyInteractiveContentSchema.safeParse(
      sharedResource.payload
    );

    return parsedPayload.success ? parsedPayload.data : null;
  }
}
