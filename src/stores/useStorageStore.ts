import { create } from 'zustand';

export interface StorageFile {
  id: string;
  name: string;
  type: string;
  size: number;
  folderId: string;
  createdAt: Date;
  data?: string;
}

export interface StorageFolder {
  id: string;
  name: string;
  parentId: string | null;
  children: string[];
  createdAt: Date;
}

interface StorageState {
  files: StorageFile[];
  folders: Record<string, StorageFolder>;
  currentFolderId: string;

  // Actions
  setCurrentFolderId: (id: string) => void;
  initStore: (data: {
    files: StorageFile[];
    folders: Record<string, StorageFolder>;
  }) => void;
  addFile: (file: StorageFile) => void;
  deleteFile: (fileId: string) => void;
  renameFile: (fileId: string, newName: string) => void;
  moveFile: (fileId: string, targetFolderId: string) => void;
  addFolder: (folder: StorageFolder) => void;
  deleteFolder: (folderId: string) => void;
  renameFolder: (folderId: string, newName: string) => void;
  moveFolder: (folderId: string, targetParentId: string) => void;
  getFolderPath: (folderId: string) => StorageFolder[];
  getFolderContents: (folderId: string) => {
    files: StorageFile[];
    folders: StorageFolder[];
  };
}

export const useStorageStore = create<StorageState>((set, get) => ({
  files: [],
  folders: {},
  currentFolderId: 'root',

  setCurrentFolderId: (id) => set({ currentFolderId: id }),

  initStore: (data) =>
    set({
      files: data.files,
      folders: data.folders,
    }),

  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
    })),

  deleteFile: (fileId) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
    })),

  renameFile: (fileId, newName) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, name: newName } : f
      ),
    })),

  moveFile: (fileId, targetFolderId) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, folderId: targetFolderId } : f
      ),
    })),

  addFolder: (folder) =>
    set((state) => {
      const newFolders = { ...state.folders, [folder.id]: folder };
      if (folder.parentId && newFolders[folder.parentId]) {
        const parent = newFolders[folder.parentId];
        newFolders[folder.parentId] = {
          ...parent,
          children: [...parent.children, folder.id],
        };
      }
      return { folders: newFolders };
    }),

  deleteFolder: (folderId) =>
    set((state) => {
      const newFolders = { ...state.folders };
      const folder = newFolders[folderId];
      if (folder?.parentId && newFolders[folder.parentId]) {
        const parent = newFolders[folder.parentId];
        newFolders[folder.parentId] = {
          ...parent,
          children: parent.children.filter((id) => id !== folderId),
        };
      }
      delete newFolders[folderId];

      return {
        folders: newFolders,
        files: state.files.filter((f) => f.folderId !== folderId),
      };
    }),

  renameFolder: (folderId, newName) =>
    set((state) => {
      const folder = state.folders[folderId];
      if (!folder) return state;
      return {
        folders: {
          ...state.folders,
          [folderId]: { ...folder, name: newName },
        },
      };
    }),

  moveFolder: (folderId, targetParentId) =>
    set((state) => {
      const folder = state.folders[folderId];
      if (!folder) return state;

      const newFolders = { ...state.folders };

      // Remove from old parent
      if (folder.parentId && newFolders[folder.parentId]) {
        const oldParent = newFolders[folder.parentId];
        newFolders[folder.parentId] = {
          ...oldParent,
          children: oldParent.children.filter((id) => id !== folderId),
        };
      }

      // Add to new parent
      if (targetParentId && newFolders[targetParentId]) {
        const newParent = newFolders[targetParentId];
        newFolders[targetParentId] = {
          ...newParent,
          children: [...newParent.children, folderId],
        };
      }

      // Update folder's parentId
      newFolders[folderId] = { ...folder, parentId: targetParentId };

      return { folders: newFolders };
    }),

  getFolderPath: (folderId: string) => {
    const state = get();
    const path: StorageFolder[] = [];
    let currentId: string | null = folderId;
    while (currentId) {
      const folder: StorageFolder | undefined = state.folders[currentId];
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return path;
  },

  getFolderContents: (folderId) => {
    const state = get();
    const folderFiles = state.files.filter((f) => f.folderId === folderId);
    const subFolders = Object.values(state.folders).filter(
      (f) => f.parentId === folderId
    );
    return { files: folderFiles, folders: subFolders };
  },
}));
