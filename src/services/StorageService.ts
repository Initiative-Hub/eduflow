import { Prisma, type FileInventory } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  buildInventoryObjectKey,
  deleteInventoryObject,
  downloadInventoryObject,
  createInventoryReadSignedUrl,
  FILE_INVENTORY_BUCKET_NAME,
  uploadInventoryObject,
} from '@/lib/storage/file-storage';

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').slice(0, 180);
}

async function ensureParentFolder(
  userId: string,
  parentId?: string | null
): Promise<FileInventory | null> {
  if (!parentId) {
    return null;
  }

  const parent = await prisma.fileInventory.findFirst({
    where: {
      id: parentId,
      userId,
      isFolder: true,
      deletedAt: null,
    },
  });

  if (!parent) {
    throw new Error('Parent folder not found');
  }

  return parent;
}

async function isDescendantOf(options: {
  userId: string;
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
          userId: options.userId,
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

async function collectDescendantIds(userId: string, rootId: string) {
  const ids: string[] = [rootId];
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const children = await prisma.fileInventory.findMany({
      where: {
        userId,
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

async function collectDescendantEntries(userId: string, rootId: string) {
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
        userId,
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
        userId,
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
  static async listDirectory(options: {
    userId: string;
    parentId?: string | null;
    search?: string;
    limit: number;
    offset: number;
  }) {
    await ensureParentFolder(options.userId, options.parentId ?? null);

    const where: Prisma.FileInventoryWhereInput = {
      userId: options.userId,
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
      items,
      total,
    };
  }

  static async createFolder(options: {
    userId: string;
    parentId?: string | null;
    name: string;
  }) {
    await ensureParentFolder(options.userId, options.parentId ?? null);

    const normalizedName = normalizeName(options.name);
    if (!normalizedName) {
      throw new Error('Folder name is required');
    }

    const duplicate = await prisma.fileInventory.findFirst({
      where: {
        userId: options.userId,
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

    return prisma.fileInventory.create({
      data: {
        userId: options.userId,
        parentId: options.parentId ?? null,
        name: normalizedName,
        isFolder: true,
        status: 'READY',
      },
    });
  }

  static async uploadFileDirect(options: {
    userId: string;
    parentId?: string | null;
    path?: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    body: Uint8Array;
  }) {
    await ensureParentFolder(options.userId, options.parentId ?? null);

    const normalizedName = normalizeName(options.fileName);
    if (!normalizedName) {
      throw new Error('File name is required');
    }

    const objectKey = buildInventoryObjectKey(options.userId, normalizedName, {
      relativePath: options.path,
    });
    const extension = normalizedName.includes('.')
      ? (normalizedName.split('.').pop()?.toLowerCase() ?? null)
      : null;

    await uploadInventoryObject({
      objectKey,
      contentType: options.contentType,
      body: options.body,
    });

    const file = await prisma.fileInventory.create({
      data: {
        userId: options.userId,
        parentId: options.parentId ?? null,
        name: normalizedName,
        isFolder: false,
        status: 'READY',
        fileSize: BigInt(options.fileSize),
        mimeType: options.contentType,
        extension,
        bucket: FILE_INVENTORY_BUCKET_NAME,
        objectKey,
        uploadedAt: new Date(),
      },
    });

    return file;
  }

  static async createUploadTarget(options: {
    userId: string;
    parentId?: string | null;
    path?: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) {
    await ensureParentFolder(options.userId, options.parentId ?? null);

    const normalizedName = normalizeName(options.fileName);
    if (!normalizedName) {
      throw new Error('File name is required');
    }

    const objectKey = buildInventoryObjectKey(options.userId, normalizedName, {
      relativePath: options.path,
    });
    const extension = normalizedName.includes('.')
      ? (normalizedName.split('.').pop()?.toLowerCase() ?? null)
      : null;

    const file = await prisma.fileInventory.create({
      data: {
        userId: options.userId,
        parentId: options.parentId ?? null,
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

    return file;
  }

  static async uploadPreparedFile(options: {
    userId: string;
    fileId: string;
    contentType: string;
    body: Uint8Array;
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

    await uploadInventoryObject({
      objectKey: existing.objectKey,
      contentType: options.contentType,
      body: options.body,
    });

    return prisma.fileInventory.update({
      where: {
        id: existing.id,
      },
      data: {
        status: 'READY',
        mimeType: options.contentType,
        uploadedAt: new Date(),
      },
    });
  }

  static async createShareUrl(options: {
    userId: string;
    fileId: string;
    expiresInSeconds?: number;
  }) {
    const file = await prisma.fileInventory.findFirst({
      where: {
        id: options.fileId,
        userId: options.userId,
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

  static async createShareUrlsBatch(options: {
    userId: string;
    fileIds: string[];
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
        userId: options.userId,
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

  static async updateEntry(options: {
    userId: string;
    fileId: string;
    name?: string;
    parentId?: string | null;
  }) {
    const current = await prisma.fileInventory.findFirst({
      where: {
        id: options.fileId,
        userId: options.userId,
        deletedAt: null,
      },
    });

    if (!current) {
      throw new Error('File not found');
    }

    const nextParentId =
      options.parentId === undefined ? current.parentId : options.parentId;
    await ensureParentFolder(options.userId, nextParentId);

    if (nextParentId && current.isFolder) {
      const cycle = await isDescendantOf({
        userId: options.userId,
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
        userId: options.userId,
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

    return prisma.fileInventory.update({
      where: {
        id: current.id,
      },
      data: {
        name: nextName,
        parentId: nextParentId ?? null,
      },
    });
  }

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

  static async deleteEntries(options: { userId: string; fileIds: string[] }) {
    const uniqueIds = Array.from(new Set(options.fileIds));
    if (uniqueIds.length === 0) {
      return { deletedCount: 0 };
    }

    const roots = await prisma.fileInventory.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
        userId: options.userId,
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
      const entries = await collectDescendantEntries(options.userId, root.id);
      allEntries.push(...entries);
    }

    const allIds = Array.from(new Set(allEntries.map((entry) => entry.id)));

    for (const entry of allEntries) {
      if (!entry.isFolder && entry.objectKey) {
        try {
          await deleteInventoryObject({ objectKey: entry.objectKey });
        } catch {
          continue;
        }
      }
    }

    const now = new Date();
    const updated = await prisma.fileInventory.updateMany({
      where: {
        userId: options.userId,
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

  static async getAnalytics(options: { userId: string }) {
    const [fileCount, folderCount, sizeAggregate] = await Promise.all([
      prisma.fileInventory.count({
        where: {
          userId: options.userId,
          isFolder: false,
          deletedAt: null,
          status: 'READY',
        },
      }),
      prisma.fileInventory.count({
        where: {
          userId: options.userId,
          isFolder: true,
          deletedAt: null,
        },
      }),
      prisma.fileInventory.aggregate({
        where: {
          userId: options.userId,
          isFolder: false,
          deletedAt: null,
          status: 'READY',
        },
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
}
