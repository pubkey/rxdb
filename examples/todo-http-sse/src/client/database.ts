import {
    addRxPlugin,
    createRxDatabase,
    type RxCollection,
    type RxDatabase
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedKeyCompressionStorage } from 'rxdb/plugins/key-compression';
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
import { todoSchema, type TodoDocType } from '../shared/schema.ts';
import { todoConflictHandler } from './conflict-handler.ts';

/**
 * With leader election, only one browser tab runs the replication.
 * The other tabs get the changes over the BroadcastChannel.
 */
addRxPlugin(RxDBLeaderElectionPlugin);
/**
 * The cleanup plugin removes deleted documents from the local storage
 * after they have been replicated to the server.
 */
addRxPlugin(RxDBCleanupPlugin);

export type TodoCollection = RxCollection<TodoDocType>;
export type TodoDatabase = RxDatabase<{ todos: TodoCollection; }>;

export type CreateTodoDatabaseOptions = {
    name: string;
    /**
     * In a real app, derive this from the user login
     * instead of shipping it with the source code.
     */
    password: string;
    /**
     * Only used in the tests to pass the fake-indexeddb implementation.
     */
    dexieSettings?: Parameters<typeof getRxStorageDexie>[0];
    multiInstance?: boolean;
};

export async function createTodoDatabase(options: CreateTodoDatabaseOptions): Promise<TodoDatabase> {
    /**
     * The storage wrappers run from the outside to the inside on writes:
     * validate -> encrypt -> compress keys -> Dexie.js (IndexedDB).
     * The validation runs first so that it sees the plain document data.
     */
    const storage = wrappedValidateAjvStorage({
        storage: wrappedKeyEncryptionCryptoJsStorage({
            storage: wrappedKeyCompressionStorage({
                storage: getRxStorageDexie(options.dexieSettings)
            })
        })
    });

    const db = await createRxDatabase<{ todos: TodoCollection; }>({
        name: options.name,
        storage,
        password: options.password,
        multiInstance: options.multiInstance ?? true,
        cleanupPolicy: {
            minimumDeletedTime: 1000 * 60 * 60 * 24 * 7,
            waitForLeadership: true,
            awaitReplicationsInSync: true
        }
    });

    await db.addCollections({
        todos: {
            schema: todoSchema,
            conflictHandler: todoConflictHandler
        }
    });

    return db;
}
