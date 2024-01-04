import { Observable } from 'rxjs';
import type { BackupOptions, RxBackupWriteEvent, RxDatabase, RxDocument, RxPlugin } from '../../types/index.d.ts';
/**
 * Backups a single documents,
 * returns the paths to all written files
 */
export declare function backupSingleDocument(rxDocument: RxDocument<any, any>, options: BackupOptions): Promise<string[]>;
export declare class RxBackupState {
    readonly database: RxDatabase;
    readonly options: BackupOptions;
    isStopped: boolean;
    private subs;
    private persistRunning;
    private initialReplicationDone$;
    private readonly internalWriteEvents$;
    readonly writeEvents$: Observable<RxBackupWriteEvent>;
    constructor(database: RxDatabase, options: BackupOptions);
    /**
     * Persists all data from all collections,
     * beginning from the oldest sequence checkpoint
     * to the newest one.
     * Do not call this while it is already running.
     * Returns true if there are more documents to process
     */
    persistOnce(): Promise<void>;
    _persistOnce(): Promise<void>;
    watchForChanges(): void;
    /**
     * Returns a promise that resolves when the initial backup is done
     * and the filesystem is in sync with the database state
     */
    awaitInitialBackup(): Promise<boolean>;
    cancel(): Promise<boolean>;
}
export declare function backup(this: RxDatabase, options: BackupOptions): RxBackupState;
export * from './file-util.ts';
export declare const RxDBBackupPlugin: RxPlugin;
