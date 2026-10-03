import { NextResponse } from 'next/server';
import { CloudDriveExportArtifactError } from '@/services/cloud-drive/CloudDriveExportArtifactError';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { oneDriveExportRequestSchema } from '@/lib/validations/onedrive-export.schema';
import { CloudDriveExportArtifactService } from '@/services/cloud-drive/CloudDriveExportArtifactService';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';
import { OneDriveExportError } from '@/services/onedrive/OneDriveExportError';
import { OneDriveExportService } from '@/services/onedrive/OneDriveExportService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * @swagger
 * /api/v1/integrations/onedrive/exports:
 *   post:
 *     summary: Export an owned artifact to OneDrive
 *     description: Resolves an owned source and returns destination, fileId, mimeType, name, size, webViewLink, and reused under data. Filenames include a stable request marker. A retry with the same user, request ID, filename, and destination reuses the completed file while it remains at that path.
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [requestId, source]
 *             properties:
 *               requestId:
 *                 type: string
 *                 format: uuid
 *                 description: Reuse this ID for retries of the same export and destination.
 *               source:
 *                 oneOf:
 *                   - type: object
 *                     additionalProperties: false
 *                     required: [kind, fileName, labels, vocabularyIds]
 *                     properties:
 *                       kind:
 *                         type: string
 *                         enum: [wordbank_csv]
 *                       fileName:
 *                         type: string
 *                         minLength: 1
 *                         maxLength: 200
 *                         pattern: '^[^/\\\r\n]+$'
 *                       vocabularyIds:
 *                         type: array
 *                         minItems: 1
 *                         maxItems: 500
 *                         uniqueItems: true
 *                         items:
 *                           type: string
 *                           format: uuid
 *                       labels:
 *                         type: object
 *                         additionalProperties: false
 *                         required: [title, word, pronunciation, englishDefinition, vietnameseTranslation, exampleSentence, mastery, wordLists]
 *                         properties:
 *                           title:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 100
 *                           word:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 100
 *                           pronunciation:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 100
 *                           englishDefinition:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 100
 *                           vietnameseTranslation:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 100
 *                           exampleSentence:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 100
 *                           mastery:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 100
 *                           wordLists:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 100
 *                   - type: object
 *                     additionalProperties: false
 *                     required: [kind, lessonId]
 *                     properties:
 *                       kind:
 *                         type: string
 *                         enum: [lesson_presentation]
 *                       lessonId:
 *                         type: string
 *                         format: uuid
 *                   - type: object
 *                     additionalProperties: false
 *                     required: [kind, fileId]
 *                     properties:
 *                       kind:
 *                         type: string
 *                         enum: [inventory_file]
 *                       fileId:
 *                         type: string
 *                         format: uuid
 *                       courseId:
 *                         type: string
 *                         format: uuid
 *                   - type: object
 *                     additionalProperties: false
 *                     required: [kind, chatId, messageId, contentIndex, fileName]
 *                     properties:
 *                       kind:
 *                         type: string
 *                         enum: [study_interactive_html]
 *                       chatId:
 *                         type: string
 *                         minLength: 1
 *                         maxLength: 200
 *                       messageId:
 *                         type: string
 *                         minLength: 1
 *                         maxLength: 200
 *                       contentIndex:
 *                         type: integer
 *                         minimum: 0
 *                         maximum: 100
 *                       fileName:
 *                         type: string
 *                         minLength: 1
 *                         maxLength: 200
 *                         pattern: '^[^/\\\r\n]+$'
 *                       content:
 *                         type: object
 *                         description: Optional interactive content, verified against the owned message.
 *                         required: [title, description, html]
 *                         properties:
 *                           title:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 120
 *                           description:
 *                             type: string
 *                             maxLength: 500
 *                           html:
 *                             type: string
 *                             minLength: 1
 *                             maxLength: 150000
 *     responses:
 *       200:
 *         description: The operation completed successfully.
 *       400:
 *         description: Malformed JSON or invalid request parameters.
 *       401:
 *         description: Authentication is required.
 *       404:
 *         description: The source file or parent folder was not found.
 *       409:
 *         description: OneDrive must be connected, or the destination or storage operation has a conflict.
 *       413:
 *         description: The file exceeds the 50 MB limit.
 *       500:
 *         description: The server or provider operation failed.
 *       502:
 *         description: The Microsoft Graph operation failed.
 */
export const POST = withAuth(async (request, session) => {
  const startedAt = Date.now();
  const parsed = oneDriveExportRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid OneDrive export request.',
      400,
      parsed.error.flatten()
    );
  }

  try {
    const [artifact, context] = await Promise.all([
      CloudDriveExportArtifactService.resolve({
        source: parsed.data.source,
        userId: session.user.id,
      }),
      OneDriveDestinationService.getExportContext(session.user.id),
    ]);
    const result = await OneDriveExportService.uploadArtifact({
      artifact,
      context,
      requestId: parsed.data.requestId,
      userId: session.user.id,
    });
    console.info('[OneDriveExport]', {
      destinationKind: result.destination.kind,
      durationMs: Date.now() - startedAt,
      resultCode: 'SUCCESS',
      sourceKind: parsed.data.source.kind,
      uploadMode: result.reused
        ? 'reused'
        : artifact.bytes.byteLength <= 4 * 1024 * 1024
          ? 'small'
          : 'session',
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    if (
      error instanceof OneDriveExportError ||
      error instanceof CloudDriveExportArtifactError
    ) {
      console.info('[OneDriveExport]', {
        durationMs: Date.now() - startedAt,
        resultCode: error.code,
        sourceKind: parsed.data.source.kind,
      });
      return errorResponse(
        error.code,
        error.message,
        error.status,
        error.details
      );
    }
    const message =
      error instanceof Error ? error.message : 'OneDrive export failed.';
    if (message === 'OneDrive is not connected.') {
      return errorResponse('DRIVE_NOT_CONNECTED', message, 409);
    }
    if (message === 'OneDrive export destination is not configured.') {
      return errorResponse('DRIVE_DESTINATION_REQUIRED', message, 409);
    }
    return errorResponse('DRIVE_UPLOAD_FAILED', message, 502);
  }
});
