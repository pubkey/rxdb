import * as path from 'path';
import {
    BehaviorSubject,
    firstValueFrom,
    fromEvent,
    Observable,
    Subject,
    Subscription
} from 'rxjs';
import {
    filter,
    map
} from 'rxjs/operators';
import { getNewestSequence } from '../../pouch-db';
import type {
    BackupOptions,
    PouchdbChangesResult,
    RxBackupWriteEvent,
    RxDatabase,
    RxDocument,
    RxPlugin
} from '../../types';
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
                    await writeToFile(attachmentFileLocation, content as Buffer);
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
    const ar = BACKUP_STATES_BY_DB.get(db);
    if (!ar) {
        throw new Error('this should never happen');
    }
    ar.push(state);
}

export class RxBackupState {
    public isStopped: boolean = false;
    private subs: Subscription[] = [];
    private persistRunning: Promise<void> = Promise.resolve();
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
     * beginning from the last sequence checkpoint
     * to the newest one.
     * Do not call this while it is already running.
     * Returns true if there are more documents to process
     */
    public async persistOnce() {
        return this.persistRunning = this.persistRunning.then(() => this._persistOnce());
    }

    public async _persistOnce() {
        const meta = await getMeta(this.options);

        await Promise.all(
            Object
                .keys(this.database.collections)
                .map(async (collectionName) => {
                    const processedDocuments: Set<string> = new Set();
                    const collection = this.database.collections[collectionName];

                    await this.database.requestIdlePromise();
                    const newestSeq = await getNewestSequence(collection.pouch);

                    if (!meta.collectionStates[collectionName]) {
                        meta.collectionStates[collectionName] = {
                            newestKnownSequence: newestSeq,
                            lastSequence: 0
                        };
                    }
                    let lastSequence = meta.collectionStates[collectionName].lastSequence;

                    let hasMore = true;
                    while (hasMore && !this.isStopped) {
                        await this.database.requestIdlePromise();
                        const pouchChanges: PouchdbChangesResult = await collection.pouch.changes({
                            live: false,
                            since: lastSequence,
                            limit: this.options.batchSize,
                            include_docs: false
                        });
                        lastSequence = pouchChanges.last_seq;
                        meta.collectionStates[collectionName].lastSequence = lastSequence;

                        const docIds: string[] = pouchChanges.results
                            .filter(doc => {
                                if (
                                    processedDocuments.has(doc.id) &&
                                    doc.seq < newestSeq
                                ) {
                                    return false;
                                } else {
                                    processedDocuments.add(doc.id);
                                    return true;
                                }
                            })
                            .map(r => r.id)
                            .filter(id => !id.startsWith('_design/'))
                            // unique
                            .filter((elem, pos, arr) => arr.indexOf(elem) === pos);
                        await this.database.requestIdlePromise();

                        const docs: Map<string, RxDocument> = await collection.findByIds(docIds);
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

                    meta.collectionStates[collectionName].lastSequence = lastSequence;
                    await setMeta(this.options, meta);
                })
        );

        if (!this.initialReplicationDone$.getValue()) {
            this.initialReplicationDone$.next(true);
        }
    }

    public watchForChanges() {
        const collections = Object.values(this.database.collections);
        collections.forEach(collection => {
            const changes$: Observable<any> =
                fromEvent(
                    collection.pouch.changes({
                        since: 'now',
                        live: true,
                        include_docs: false
                    }),
                    'change'
                );

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
            return Promise.resolve(false);
        }
        this.isStopped = true;
        this.subs.forEach(sub => sub.unsubscribe());
        return Promise.resolve(true);
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
        preDestroyRxDatabase(db: RxDatabase) {
            const states = BACKUP_STATES_BY_DB.get(db);
            if (states) {
                states.forEach(state => state.cancel());
            }
        }
    }
};
