/**
 * Request parameters for move file operation
 */
export interface MoveFileRequest {
  oldPath: string;
  newPath: string;
  root?: string;
  updateReferences?: boolean;
}

/**
 * Result of move file operation
 */
export interface MoveFileResult {
  oldPath: string;
  newPath: string;
  moved: boolean;
  updatedFiles?: UpdatedFile[];
}

/**
 * File that was updated during move operation
 */
export interface UpdatedFile {
  filePath: string;
  updates: UpdateInfo[];
}

/**
 * Information about a specific update
 */
export interface UpdateInfo {
  type: 'namespace' | 'use' | 'require' | 'include';
  old: string;
  new: string;
  line: number;
}