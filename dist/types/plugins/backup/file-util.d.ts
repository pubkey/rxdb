import type { BackupMetaFileContent, BackupOptions, RxDatabase } from '../../types/index.d.ts';
/**
 * ensure that the given folder exists
 */
export declare function ensureFolderExists(folderPath: string): void;
/**
 * deletes and recreates the folder
 */
export declare function clearFolder(folderPath: string): void;
export declare function deleteFolder(folderPath: string): void;
export declare function prepareFolders(database: RxDatabase, options: BackupOptions): void;
export declare function writeToFile(location: string, data: string | Blob): Promise<void>;
export declare function writeJsonToFile(location: string, data: any): Promise<void>;
export declare function metaFileLocation(options: BackupOptions): string;
export declare function getMeta(options: BackupOptions): Promise<BackupMetaFileContent>;
export declare function setMeta(options: BackupOptions, meta: BackupMetaFileContent): Promise<void>;
export declare function documentFolder(options: BackupOptions, docId: string): string;
