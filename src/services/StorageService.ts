import {
  CourseEnrollmentStatus,
  type FileInventory,
  type Prisma,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  buildInventoryObjectKey,
  createInventoryReadSignedUrl,
  createInventoryWriteSignedUrl,
  deleteInventoryObject,
  downloadInventoryObject,
  FILE_INVENTORY_BUCKET_NAME,
  getInventoryObjectMetadata,
  STORAGE_MAX_FILE_SIZE_BYTES,
  uploadInventoryObject,
} from '@/lib/storage/file-storage';

/**
 * Normalizes a file or folder name by trimming, collapsing whitespace,
 * and capping the length to a safe storage-friendly value.
 */
function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 180);
}

type SerializedFileInventory = Omit<FileInventory, 'fileSize'> & {
  fileSize: number | null;
};

type ChatAttachmentFileRef = {
  courseId?: string | null;
  fileId: string;
};

function buildInventoryScope(options: {
  userId: string;
  courseId?: string | null;
}): Prisma.FileInventoryWhereInput {
  if (options.courseId) {
    return {
      courseId: options.courseId,
    };
  }

  return {
    userId: options.userId,
    courseId: null,
  };
}

function serializeFileInventory(
  record: FileInventory
): SerializedFileInventory {
  return {
    ...record,
    fileSize: record.fileSize === null ? null : Number(record.fileSize),
  };
}

/**
 * Ensures the provided parent exists, belongs to the user, is a folder,
 * and is not soft-deleted.
 */
async function ensureParentFolder(
  userId: string,
  parentId?: string | null,
  courseId?: string | null
): Promise<FileInventory | null> {
  if (!parentId) {
    return null;
  }

  const parent = await prisma.fileInventory.findFirst({
    where: {
      id: parentId,
      ...buildInventoryScope({ userId, courseId }),
      isFolder: true,
      deletedAt: null,
    },
  });

  if (!parent) {
    throw new Error('Parent folder not found');
  }

  return parent;
}

/**
 * Ensures a folder path exists by traversing and creating missing folders
 * in sequence. This is used for uploads with nested paths to avoid multiple
 * round-trips when intermediate folders do not exist.
 */
async function ensureFolderPath(options: {
  userId: string;
  courseId?: string | null;
  folderPath?: string[];
}) {
  let parentId: string | null = null;

  for (const name of options.folderPath ?? []) {
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      throw new Error('Folder name is required');
    }

    const existing: Pick<FileInventory, 'id' | 'isFolder'> | null =
      await prisma.fileInventory.findFirst({
        where: {
          ...buildInventoryScope({
            userId: options.userId,
            courseId: options.courseId,
          }),
          parentId,
          deletedAt: null,
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          isFolder: true,
        },
      });

    if (existing) {
      if (!existing.isFolder) {
        throw new Error('An item with this name already exists');
      }

      parentId = existing.id;
      continue;
    }

    const folder: FileInventory = await prisma.fileInventory.create({
      data: {
        userId: options.userId,
        courseId: options.courseId ?? null,
        parentId,
        name: normalizedName,
        isFolder: true,
        status: 'READY',
      },
    });

    parentId = folder.id;
  }

  return parentId;
}

/**
 * Checks whether a candidate node is inside the subtree of an ancestor node.
 */
async function isDescendantOf(options: {
  userId: string;
  courseId?: string | null;
  ancestorId: string;
  candidateId: string;
}) {
  let cursor: string | null = options.candidateId;

  while (cursor) {
    if (cursor === options.ancestorId) {
      return true;
    }

    const node: { parentId: string | null } | null =
      await prisma.fileInventory.findFirst({
        where: {
          id: cursor,
          ...buildInventoryScope({
            userId: options.userId,
            courseId: options.courseId,
          }),
          deletedAt: null,
        },
        select: {
          parentId: true,
        },
      });

    if (!node) {
      return false;
    }

    cursor = node.parentId;
  }

  return false;
}

/**
 * Collects all descendant ids (including the root id) for recursive
 * folder operations such as soft deletion.
 */
async function collectDescendantIds(
  userId: string,
  rootId: string,
  courseId?: string | null
) {
  const ids: string[] = [rootId];
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const children = await prisma.fileInventory.findMany({
      where: {
        ...buildInventoryScope({ userId, courseId }),
        parentId: current,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }

  return ids;
}

/**
 * Collects recursive entries (folders and files) from a root node,
 * including object keys needed for storage cleanup.
 */
async function collectDescendantEntries(
  userId: string,
  rootId: string,
  courseId?: string | null
) {
  const entries: Array<Pick<FileInventory, 'id' | 'isFolder' | 'objectKey'>> =
    [];
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const node = await prisma.fileInventory.findFirst({
      where: {
        id: current,
        ...buildInventoryScope({ userId, courseId }),
        deletedAt: null,
      },
      select: {
        id: true,
        isFolder: true,
        objectKey: true,
      },
    });

    if (!node) {
      continue;
    }

    entries.push(node);

    if (!node.isFolder) {
      continue;
    }

    const children = await prisma.fileInventory.findMany({
      where: {
        ...buildInventoryScope({ userId, courseId }),
        parentId: node.id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    for (const child of children) {
      queue.push(child.id);
    }
  }

  return entries;
}

export class StorageService {
  /**
   * Lists items in a directory with optional name search and pagination.
   */
  static async listDirectory(options: {
    userId: string;
    courseId?: string | null;
    parentId?: string | null;
    search?: string;
    limit: number;
    offset: number;
  }) {
    await ensureParentFolder(
      options.userId,
      options.parentId ?? null,
      options.courseId
    );

    const where: Prisma.FileInventoryWhereInput = {
      ...buildInventoryScope({
        userId: options.userId,
        courseId: options.courseId,
      }),
      parentId: options.parentId ?? null,
      deletedAt: null,
      ...(options.search
        ? {
            name: {
              contains: options.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.fileInventory.findMany({
        where,
        take: options.limit,
        skip: options.offset,
        orderBy: [{ isFolder: 'desc' }, { name: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.fileInventory.count({ where }),
    ]);

    return {
      items: items.map(serializeFileInventory),
      total,
    };
  }

  /**
   * Creates a new folder under the target parent while enforcing
   * case-insensitive name uniqueness within the same directory.
   */
  static async createFolder(options: {
    userId: string;
    courseId?: string | null;
    parentId?: string | null;
    name: string;
  }) {
    await ensureParentFolder(
      options.userId,
      options.parentId ?? null,
      options.courseId
    );

    const normalizedName = normalizeName(options.name);
    if (!normalizedName) {
      throw new Error('Folder name is required');
    }

    const duplicate = await prisma.fileInventory.findFirst({
      where: {
        ...buildInventoryScope({
          userId: options.userId,
          courseId: options.courseId,
        }),
        parentId: options.parentId ?? null,
        deletedAt: null,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new Error('An item with this name already exists');
    }

    const folder = await prisma.fileInventory.create({
      data: {
        userId: options.userId,
        courseId: options.courseId ?? null,
        parentId: options.parentId ?? null,
        name: normalizedName,
        isFolder: true,
        status: 'READY',
      },
    });

    return serializeFileInventory(folder);
  }

  /**
   * Creates a pending inventory record and metadata before binary
   * content is uploaded separately.
   */
  static async initializeUpload(options: {
    userId: string;
    courseId?: string | null;
    parentId?: string | null;
    folderPath?: string[];
    fileName: string;
    contentType: string;
    fileSize: number;
  }) {
    const usesFolderPath = Boolean(options.folderPath?.length);
    const parentId = usesFolderPath
      ? await ensureFolderPath({
          userId: options.userId,
          courseId: options.courseId,
          folderPath: options.folderPath,
        })
      : (options.parentId ?? null);
    if (!usesFolderPath) {
      await ensureParentFolder(options.userId, parentId, options.courseId);
    }

    const normalizedName = normalizeName(options.fileName);
    if (!normalizedName) {
      throw new Error('File name is required');
    }

    if (options.fileSize > STORAGE_MAX_FILE_SIZE_BYTES) {
      throw new Error('File size exceeds storage upload limit');
    }

    const objectKey = buildInventoryObjectKey(options.userId, normalizedName, {
      courseId: options.courseId ?? undefined,
    });
    const extension = normalizedName.includes('.')
      ? (normalizedName.split('.').pop()?.toLowerCase() ?? null)
      : null;

    const file = await prisma.fileInventory.create({
      data: {
        userId: options.userId,
        courseId: options.courseId ?? null,
        parentId,
        name: normalizedName,
        isFolder: false,
        status: 'UPLOADING',
        fileSize: BigInt(options.fileSize),
        mimeType: options.contentType,
        extension,
        bucket: FILE_INVENTORY_BUCKET_NAME,
        objectKey,
      },
    });

    const uploadUrl = await createInventoryWriteSignedUrl({
      objectKey,
      contentType: options.contentType,
    });

    return {
      id: file.id,
      status: file.status,
      objectKey,
      bucket: FILE_INVENTORY_BUCKET_NAME,
      uploadUrl,
      uploadHeaders: {
        'Content-Type': options.contentType,
      },
    };
  }

  /**
   * Verifies uploaded object existence for a pending file and marks
   * the entry as READY.
   */
  static async confirmUpload(options: {
    userId: string;
    fileId: string;
    checksumSha256?: string | null;
  }) {
    const existing = await prisma.fileInventory.findFirst({
      where: {
        id: options.fileId,
        userId: options.userId,
        deletedAt: null,
      },
    });

    if (!existing || existing.isFolder) {
      throw new Error('File not found');
    }

    if (!existing.objectKey) {
      throw new Error('File object key is missing');
    }

    const metadata = await getInventoryObjectMetadata({
      objectKey: existing.objectKey,
    });

    if (!metadata.exists) {
      await prisma.fileInventory.delete({
        where: { id: existing.id },
      });
      throw new Error('Uploaded object not found. Database entry rolled back.');
    }

    if (
      metadata.contentLength === null ||
      metadata.contentLength > STORAGE_MAX_FILE_SIZE_BYTES
    ) {
      await prisma.fileInventory.delete({
        where: { id: existing.id },
      });
      throw new Error('Uploaded object exceeds storage upload limit.');
    }

    if (existing.fileSize !== null) {
      const expectedSize = Number(existing.fileSize);
      if (metadata.contentLength !== expectedSize) {
        await prisma.fileInventory.delete({
          where: { id: existing.id },
        });
        throw new Error(
          'Uploaded object size mismatch. Database entry rolled back.'
        );
      }
    }

    const uploaded = await prisma.fileInventory.update({
      where: {
        id: existing.id,
      },
      data: {
        status: 'READY',
        checksumSha256: options.checksumSha256 ?? null,
        uploadedAt: new Date(),
      },
    });

    return serializeFileInventory(uploaded);
  }

  /**
   * Generates a temporary signed read URL for a single file.
   */
  static async createShareUrl(options: {
    userId: string;
    fileId: string;
    courseId?: string | null;
    expiresInSeconds?: number;
  }) {
    const file = await prisma.fileInventory.findFirst({
      where: {
        id: options.fileId,
        ...(options.courseId
          ? { courseId: options.courseId }
          : { userId: options.userId, courseId: null }),
        isFolder: false,
        status: 'READY',
        deletedAt: null,
      },
      select: {
        objectKey: true,
      },
    });

    if (!file?.objectKey) {
      throw new Error('File not found');
    }

    return createInventoryReadSignedUrl({
      objectKey: file.objectKey,
      expiresInSeconds: options.expiresInSeconds,
    });
  }

  /**
   * Generates temporary signed read URLs for multiple files in one call.
   */
  static async createShareUrlsBatch(options: {
    userId: string;
    fileIds: string[];
    courseId?: string | null;
    expiresInSeconds?: number;
  }) {
    const uniqueIds = Array.from(new Set(options.fileIds));
    if (uniqueIds.length === 0) {
      return [];
    }

    const files = await prisma.fileInventory.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
        ...(options.courseId
          ? { courseId: options.courseId }
          : { userId: options.userId, courseId: null }),
        isFolder: false,
        status: 'READY',
        deletedAt: null,
      },
      select: {
        id: true,
        objectKey: true,
        name: true,
      },
    });

    const signed = await Promise.all(
      files
        .filter((file) => Boolean(file.objectKey))
        .map(async (file) => ({
          fileId: file.id,
          name: file.name,
          signedUrl: await createInventoryReadSignedUrl({
            objectKey: file.objectKey as string,
            expiresInSeconds: options.expiresInSeconds,
          }),
        }))
    );

    return signed;
  }

  /**
   * Generates temporary signed read URLs for chat attachments while keeping
   * attachments scoped to the user's personal inventory.
   */
  static async createChatAttachmentUrls(options: {
    userId: string;
    fileIds: string[];
    fileRefs?: ChatAttachmentFileRef[];
    expiresInSeconds?: number;
  }) {
    const uniqueIds = Array.from(new Set(options.fileIds));
    if (uniqueIds.length === 0) {
      return [];
    }
    const courseIdByFileId = new Map(
      (options.fileRefs ?? [])
        .filter((ref) => Boolean(ref.courseId))
        .map((ref) => [ref.fileId, ref.courseId as string])
    );
    const courseIds = Array.from(new Set(courseIdByFileId.values()));

    const files = await prisma.fileInventory.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
        OR: [
          {
            userId: options.userId,
            courseId: null,
          },
          ...(courseIds.length > 0
            ? [
                {
                  courseId: {
                    in: courseIds,
                  },
                  course: {
                    OR: [
                      { ownerId: options.userId },
                      {
                        enrollments: {
                          some: {
                            memberId: options.userId,
                            status: CourseEnrollmentStatus.ACTIVE,
                          },
                        },
                      },
                    ],
                  },
                },
              ]
            : []),
        ],
        isFolder: false,
        status: 'READY',
        deletedAt: null,
      },
      select: {
        id: true,
        objectKey: true,
        name: true,
        bucket: true,
        courseId: true,
        mimeType: true,
      },
    });

    const signed = await Promise.all(
      files
        .filter(
          (file) =>
            Boolean(file.objectKey) &&
            (!file.courseId || courseIdByFileId.get(file.id) === file.courseId)
        )
        .map(async (file) => ({
          fileId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          bucket: file.bucket ?? FILE_INVENTORY_BUCKET_NAME,
          objectKey: file.objectKey as string,
          signedUrl: await createInventoryReadSignedUrl({
            objectKey: file.objectKey as string,
            expiresInSeconds: options.expiresInSeconds,
          }),
        }))
    );

    return signed;
  }

  /**
   * Downloads chat attachment bytes from the user's personal inventory for
   * model calls that cannot access local signed URLs.
   */
  static async getChatAttachmentPayloads(options: {
    userId: string;
    fileIds: string[];
    fileRefs?: ChatAttachmentFileRef[];
  }) {
    const uniqueIds = Array.from(new Set(options.fileIds));
    if (uniqueIds.length === 0) {
      return [];
    }
    const courseIdByFileId = new Map(
      (options.fileRefs ?? [])
        .filter((ref) => Boolean(ref.courseId))
        .map((ref) => [ref.fileId, ref.courseId as string])
    );
    const courseIds = Array.from(new Set(courseIdByFileId.values()));

    const files = await prisma.fileInventory.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
        OR: [
          {
            userId: options.userId,
            courseId: null,
          },
          ...(courseIds.length > 0
            ? [
                {
                  courseId: {
                    in: courseIds,
                  },
                  course: {
                    OR: [
                      { ownerId: options.userId },
                      {
                        enrollments: {
                          some: {
                            memberId: options.userId,
                            status: CourseEnrollmentStatus.ACTIVE,
                          },
                        },
                      },
                    ],
                  },
                },
              ]
            : []),
        ],
        isFolder: false,
        status: 'READY',
        deletedAt: null,
      },
      select: {
        id: true,
        courseId: true,
        objectKey: true,
        name: true,
        mimeType: true,
      },
    });

    return Promise.all(
      files
        .filter(
          (file) =>
            Boolean(file.objectKey) &&
            (!file.courseId || courseIdByFileId.get(file.id) === file.courseId)
        )
        .map(async (file) => {
          const downloaded = await downloadInventoryObject({
            objectKey: file.objectKey as string,
          });

          return {
            bytes: downloaded.bytes,
            fileId: file.id,
            mimeType: file.mimeType ?? downloaded.contentType,
            name: file.name,
            objectKey: file.objectKey as string,
          };
        })
    );
  }

  /**
   * Downloads file content and returns payload data suitable for HTTP
   * response streaming.
   */
  static async getDownloadPayload(options: { userId: string; fileId: string }) {
    const file = await prisma.fileInventory.findFirst({
      where: {
        id: options.fileId,
        userId: options.userId,
        isFolder: false,
        status: 'READY',
        deletedAt: null,
      },
      select: {
        name: true,
        objectKey: true,
      },
    });

    if (!file?.objectKey) {
      throw new Error('File not found');
    }

    const downloaded = await downloadInventoryObject({
      objectKey: file.objectKey,
    });

    return {
      fileName: file.name || 'download',
      bytes: downloaded.bytes,
      contentType: downloaded.contentType,
    };
  }

  /**
   * Renames or moves an inventory entry while preventing duplicate names
   * and invalid folder cycles.
   */
  static async updateEntry(options: {
    userId: string;
    fileId: string;
    courseId?: string | null;
    name?: string;
    parentId?: string | null;
  }) {
    const current = await prisma.fileInventory.findFirst({
      where: {
        id: options.fileId,
        ...buildInventoryScope({
          userId: options.userId,
          courseId: options.courseId,
        }),
        deletedAt: null,
      },
    });

    if (!current) {
      throw new Error('File not found');
    }

    const nextParentId =
      options.parentId === undefined ? current.parentId : options.parentId;
    await ensureParentFolder(options.userId, nextParentId, current.courseId);

    if (nextParentId && current.isFolder) {
      const cycle = await isDescendantOf({
        userId: options.userId,
        courseId: current.courseId,
        ancestorId: current.id,
        candidateId: nextParentId,
      });

      if (cycle) {
        throw new Error('Cannot move a folder inside itself');
      }
    }

    const nextName =
      options.name === undefined ? current.name : normalizeName(options.name);
    if (!nextName) {
      throw new Error('Name is required');
    }

    const duplicate = await prisma.fileInventory.findFirst({
      where: {
        ...buildInventoryScope({
          userId: options.userId,
          courseId: current.courseId,
        }),
        parentId: nextParentId ?? null,
        deletedAt: null,
        id: {
          not: current.id,
        },
        name: {
          equals: nextName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new Error('An item with this name already exists');
    }

    const updated = await prisma.fileInventory.update({
      where: {
        id: current.id,
      },
      data: {
        name: nextName,
        parentId: nextParentId ?? null,
      },
    });

    return serializeFileInventory(updated);
  }

  /**
   * Soft-deletes an entry. For folders, all descendants are soft-deleted
   * recursively.
   */
  static async softDeleteEntry(options: { userId: string; fileId: string }) {
    const current = await prisma.fileInventory.findFirst({
      where: {
        id: options.fileId,
        userId: options.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        isFolder: true,
      },
    });

    if (!current) {
      throw new Error('File not found');
    }

    const ids = current.isFolder
      ? await collectDescendantIds(options.userId, current.id)
      : [current.id];

    const now = new Date();
    const updated = await prisma.fileInventory.updateMany({
      where: {
        userId: options.userId,
        id: {
          in: ids,
        },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        status: 'DELETED',
      },
    });

    return {
      deletedCount: updated.count,
    };
  }

  /**
   * Soft-deletes multiple entries and attempts object storage cleanup for
   * non-folder descendants.
   */
  static async deleteEntries(options: {
    userId: string;
    fileIds: string[];
    courseId?: string | null;
  }) {
    const uniqueIds = Array.from(new Set(options.fileIds));
    if (uniqueIds.length === 0) {
      return { deletedCount: 0 };
    }

    const roots = await prisma.fileInventory.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
        ...buildInventoryScope({
          userId: options.userId,
          courseId: options.courseId,
        }),
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const allEntries: Array<
      Pick<FileInventory, 'id' | 'isFolder' | 'objectKey'>
    > = [];

    for (const root of roots) {
      const entries = await collectDescendantEntries(
        options.userId,
        root.id,
        options.courseId
      );
      allEntries.push(...entries);
    }

    const allIds = Array.from(new Set(allEntries.map((entry) => entry.id)));

    for (const entry of allEntries) {
      if (!entry.isFolder && entry.objectKey) {
        try {
          await deleteInventoryObject({ objectKey: entry.objectKey });
        } catch {}
      }
    }

    const now = new Date();
    const updated = await prisma.fileInventory.updateMany({
      where: {
        ...buildInventoryScope({
          userId: options.userId,
          courseId: options.courseId,
        }),
        id: {
          in: allIds,
        },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        status: 'DELETED',
      },
    });

    return {
      deletedCount: updated.count,
    };
  }

  /**
   * Returns aggregate inventory metrics for dashboard-style usage stats.
   */
  static async getAnalytics(options: {
    userId: string;
    courseId?: string | null;
  }) {
    const where: Prisma.FileInventoryWhereInput = {
      ...buildInventoryScope({
        userId: options.userId,
        courseId: options.courseId,
      }),
      isFolder: false,
      deletedAt: null,
      status: 'READY',
    };

    const [fileCount, folderCount, sizeAggregate] = await Promise.all([
      prisma.fileInventory.count({
        where,
      }),
      prisma.fileInventory.count({
        where: {
          ...buildInventoryScope({
            userId: options.userId,
            courseId: options.courseId,
          }),
          isFolder: true,
          deletedAt: null,
        },
      }),
      prisma.fileInventory.aggregate({
        where,
        _sum: {
          fileSize: true,
        },
      }),
    ]);

    return {
      fileCount,
      folderCount,
      totalSizeBytes: Number(sizeAggregate._sum.fileSize ?? BigInt(0)),
    };
  }

  /**
   * Saves slide HTML content directly to S3 under slides/{deckId}.html.
   */
  static async saveSlideDeck(deckId: string, html: string): Promise<void> {
    const encoder = new TextEncoder();
    const body = encoder.encode(html);

    await uploadInventoryObject({
      objectKey: `slides/${deckId}.html`,
      contentType: 'text/html; charset=utf-8',
      body,
    });
  }

  /**
   * Fetches slide HTML content directly from S3 slides/{deckId}.html,
   * falling back to the external slide service if not yet in storage.
   */
  static async getSlideDeck(deckId: string): Promise<string> {
    try {
      const { bytes } = await downloadInventoryObject({
        objectKey: `slides/${deckId}.html`,
      });
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(bytes);
    } catch (error) {
      console.warn(
        `[StorageService] Failed to download slides/${deckId}.html from S3, falling back to external service:`,
        error
      );
      const externalServiceUrl = (
        process.env.EXTERNAL_SERVICE_URL || 'http://localhost:8000'
      ).replace(/\/$/, '');
      const res = await fetch(`${externalServiceUrl}/slides/decks/${deckId}`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Deck not found');
        }
        throw new Error(
          `Failed to fetch deck from external service: ${res.statusText}`
        );
      }

      return res.text();
    }
  }
}
