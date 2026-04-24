'use client';

import React, {
  createContext,
  type ReactNode,
  useCallback,
  useState,
} from 'react';

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

interface StorageContextType {
  files: StorageFile[];
  folders: Map<string, StorageFolder>;
  currentFolderId: string;
  setCurrentFolderId: (id: string) => void;
  addFile: (file: StorageFile) => void;
  deleteFile: (fileId: string) => void;
  renameFile: (fileId: string, newName: string) => void;
  moveFile: (fileId: string, targetFolderId: string) => void;
  addFolder: (folder: StorageFolder) => void;
  deleteFolder: (folderId: string) => void;
  renameFolder: (folderId: string, newName: string) => void;
  getFolderPath: (folderId: string) => StorageFolder[];
  getFolderContents: (folderId: string) => {
    files: StorageFile[];
    folders: StorageFolder[];
  };
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [folders, setFolders] = useState<Map<string, StorageFolder>>(() => {
    const rootFolder: StorageFolder = {
      id: 'root',
      name: 'Storage',
      parentId: null,
      children: [],
      createdAt: new Date(),
    };
    const map = new Map();
    map.set('root', rootFolder);
    return map;
  });
  const [currentFolderId, setCurrentFolderId] = useState('root');

  const addFile = useCallback((file: StorageFile) => {
    setFiles((prev) => [...prev, file]);
  }, []);

  const deleteFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const renameFile = useCallback((fileId: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, name: newName } : f))
    );
  }, []);

  const moveFile = useCallback((fileId: string, targetFolderId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, folderId: targetFolderId } : f
      )
    );
  }, []);

  const addFolder = useCallback((folder: StorageFolder) => {
    setFolders((prev) => {
      const newMap = new Map(prev);
      newMap.set(folder.id, folder);
      if (folder.parentId) {
        const parent = newMap.get(folder.parentId);
        if (parent) {
          newMap.set(folder.parentId, {
            ...parent,
            children: [...parent.children, folder.id],
          });
        }
      }
      return newMap;
    });
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => {
      const newMap = new Map(prev);
      const folder = newMap.get(folderId);
      if (folder && folder.parentId) {
        const parent = newMap.get(folder.parentId);
        if (parent) {
          newMap.set(folder.parentId, {
            ...parent,
            children: parent.children.filter((id) => id !== folderId),
          });
        }
      }
      newMap.delete(folderId);
      return newMap;
    });
    setFiles((prev) => prev.filter((f) => f.folderId !== folderId));
  }, []);

  const renameFolder = useCallback((folderId: string, newName: string) => {
    setFolders((prev) => {
      const newMap = new Map(prev);
      const folder = newMap.get(folderId);
      if (folder) {
        newMap.set(folderId, { ...folder, name: newName });
      }
      return newMap;
    });
  }, []);

  const getFolderPath = useCallback(
    (folderId: string) => {
      const path: StorageFolder[] = [];
      let currentId: string | null = folderId;
      while (currentId) {
        const folder = folders.get(currentId);
        if (folder) {
          path.unshift(folder);
          currentId = folder.parentId;
        } else {
          break;
        }
      }
      return path;
    },
    [folders]
  );

  const getFolderContents = useCallback(
    (folderId: string) => {
      const folderFiles = files.filter((f) => f.folderId === folderId);
      const subFolders = Array.from(folders.values()).filter(
        (f) => f.parentId === folderId
      );
      return { files: folderFiles, folders: subFolders };
    },
    [files, folders]
  );

  return (
    <StorageContext.Provider
      value={{
        files,
        folders,
        currentFolderId,
        setCurrentFolderId,
        addFile,
        deleteFile,
        renameFile,
        moveFile,
        addFolder,
        deleteFolder,
        renameFolder,
        getFolderPath,
        getFolderContents,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = React.useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
