import * as path from 'path';
import {
    BehaviorSubject,
    firstValueFrom,
    Observable,
    Subject,
    Subscription
} from 'rxjs';
import {
    filter,
    map
} from 'rxjs/operators';
import { newRxError } from '../../rx-error';
import type {
    BackupOptions,
    RxBackupWriteEvent,
    RxCollection,
    RxDatabase,
    RxDocument,
    RxPlugin
} from '../../types';
import {
    getFromMapOrThrow,
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_TRUE,
    PROMISE_RESOLVE_VOID
} from '../../plugins/utils';
import {
    clearFolder,
    deleteFolder,
    documentFolder,
    ensureFolderExists,
    getMeta,
    prepareFolders,
    setMeta,
    writeJsonToFile,
    writeToFile
} from './file-util';


/**
 * Backups a single documents,
 * returns the paths to all written files
 */
export async function backupSingleDocument(
    rxDocument: RxDocument<any, any>,
    options: BackupOptions
): Promise<string[]> {
    const data = rxDocument.toJSON(true);
    const writtenFiles: string[] = [];

    const docFolder = documentFolder(options, rxDocument.primary);
    await clearFolder(docFolder);

    const fileLocation = path.join(
        docFolder,
        'document.json'
    );
    await writeJsonToFile(fileLocation, data);
    writtenFiles.push(fileLocation);

    if (options.attachments) {
        const attachmentsFolder = path.join(
            docFolder,
            'attachments'
        );
        ensureFolderExists(attachmentsFolder);
        const attachments = (rxDocument as RxDocument).allAttachments();
        await Promise.all(
            attachments
                .map(async (attachment) => {
                    const content = await attachment.getData();
                    const attachmentFileLocation = path.join(
                        attachmentsFolder,
                        attachment.id
                    );
                    await writeToFile(attachmentFileLocation, content);
                    writtenFiles.push(attachmentFileLocation);
                })
        );
    }

    return writtenFiles;
}

const BACKUP_STATES_BY_DB: WeakMap<RxDatabase, RxBackupState[]> = new WeakMap();
function addToBackupStates(db: RxDatabase, state: RxBackupState) {
    if (!BACKUP_STATES_BY_DB.has(db)) {
        BACKUP_STATES_BY_DB.set(db, []);
    }
    const ar = getFromMapOrThrow(BACKUP_STATES_BY_DB, db);
    if (!ar) {
        throw newRxError('SNH');
    }
    ar.push(state);
}

export class RxBackupState {
    public isStopped: boolean = false;
    private subs: Subscription[] = [];
    private persistRunning: Promise<void> = PROMISE_RESOLVE_VOID;
    private initialReplicationDone$: BehaviorSubject<boolean> = new BehaviorSubject(false as any);

    private readonly internalWriteEvents$: Subject<RxBackupWriteEvent> = new Subject();
    public readonly writeEvents$: Observable<RxBackupWriteEvent> = this.internalWriteEvents$.asObservable();

    constructor(
        public readonly database: RxDatabase,
        public readonly options: BackupOptions
    ) {
        if (!this.options.batchSize) {
            this.options.batchSize = 10;
        }
        addToBackupStates(database, this);
        prepareFolders(database, options);
    }

    /**
     * Persists all data from all collections,
     * beginning from the oldest sequence checkpoint
     * to the newest one.
     * Do not call this while it is already running.
     * Returns true if there are more documents to process
     */
    public persistOnce() {
        return this.persistRunning = this.persistRunning.then(() => this._persistOnce());
    }

    public async _persistOnce() {
        const meta = await getMeta(this.options);

        await Promise.all(
            Object
                .entries(this.database.collections)
                .map(async ([collectionName, collection]) => {
                    const primaryKey = collection.schema.primaryPath;
                    const processedDocuments: Set<string> = new Set();

                    await this.database.requestIdlePromise();

                    if (!meta.collectionStates[collectionName]) {
                        meta.collectionStates[collectionName] = {};
                    }
                    let lastCheckpoint = meta.collectionStates[collectionName].checkpoint;

                    let hasMore = true;
                    while (hasMore && !this.isStopped) {
                        await this.database.requestIdlePromise();
                        const changesResult = await collection.storageInstance.getChangedDocumentsSince(
                            this.options.batchSize ? this.options.batchSize : 0,
                            lastCheckpoint
                        );
                        lastCheckpoint = changesResult.documents.length > 0 ? changesResult.checkpoint : lastCheckpoint;
                        meta.collectionStates[collectionName].checkpoint = lastCheckpoint;

                        const docIds: string[] = changesResult.documents
                            .map(doc => doc[primaryKey])
                            .filter(id => {
                                if (
                                    processedDocuments.has(id)
                                ) {
                                    return false;
                                } else {
                                    processedDocuments.add(id);
                                    return true;
                                }
                            })
                            .filter((elem, pos, arr) => arr.indexOf(elem) === pos); // unique
                        await this.database.requestIdlePromise();

                        const docs: Map<string, RxDocument> = await collection.findByIds(docIds).exec();
                        if (docs.size === 0) {
                            hasMore = false;
                            continue;
                        }
                        await Promise.all(
                            Array
                                .from(docs.values())
                                .map(async (doc) => {
                                    const writtenFiles = await backupSingleDocument(doc, this.options);
                                    this.internalWriteEvents$.next({
                                        collectionName: collection.name,
                                        documentId: doc.primary,
                                        files: writtenFiles,
                                        deleted: false
                                    });
                                })
                        );
                        // handle deleted documents
                        await Promise.all(
                            docIds
                                .filter(docId => !docs.has(docId))
                                .map(async (docId) => {
                                    await deleteFolder(documentFolder(this.options, docId));
                                    this.internalWriteEvents$.next({
                                        collectionName: collection.name,
                                        documentId: docId,
                                        files: [],
                                        deleted: true
                                    });
                                })
                        );
                    }
                    meta.collectionStates[collectionName].checkpoint = lastCheckpoint;
                    await setMeta(this.options, meta);
                })
        );

        if (!this.initialReplicationDone$.getValue()) {
            this.initialReplicationDone$.next(true);
        }
    }

    public watchForChanges() {
        const collections: RxCollection[] = Object.values(this.database.collections);
        collections.forEach(collection => {
            const changes$ = collection.storageInstance.changeStream();
            const sub = changes$.subscribe(() => {
                this.persistOnce();
            });
            this.subs.push(sub);
        });
    }

    /**
     * Returns a promise that resolves when the initial backup is done
     * and the filesystem is in sync with the database state
     */
    public awaitInitialBackup(): Promise<boolean> {
        return firstValueFrom(
            this.initialReplicationDone$.pipe(
                filter(v => !!v),
                map(() => true)
            )
        );
    }

    cancel(): Promise<boolean> {
        if (this.isStopped) {
            return PROMISE_RESOLVE_FALSE;
        }
        this.isStopped = true;
        this.subs.forEach(sub => sub.unsubscribe());
        return PROMISE_RESOLVE_TRUE;
    }
}


export function backup(
    this: RxDatabase,
    options: BackupOptions
): RxBackupState {
    const backupState = new RxBackupState(this, options);
    backupState.persistOnce();

    if (options.live) {
        backupState.watchForChanges();
    }

    return backupState;
}

export * from './file-util';
export const RxDBBackupPlugin: RxPlugin = {
    name: 'backup',
    rxdb: true,
    prototypes: {
        RxDatabase(proto: any) {
            proto.backup = backup;
        }
    },
    hooks: {
        preDestroyRxDatabase: {
            after: function preDestroyRxDatabase(db: RxDatabase) {
                const states = BACKUP_STATES_BY_DB.get(db);
                if (states) {
                    states.forEach(state => state.cancel());
                }
            }
        }
    }
};
