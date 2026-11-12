import type {
    RxChangeEventBulk,
    RxCollection
} from '../../index.d.ts';
import type {
    WebMCPTarget
} from '../../types/plugins/webmcp.d.ts';
import { getFromMapOrCreate } from '../utils/index.ts';
import { REPLICATION_STATE_BY_COLLECTION } from '../replication/index.ts';
import { filter, first } from 'rxjs';
import { newRxError } from '../../rx-error.ts';
import { getChangedDocumentsSince } from '../../rx-storage-helper.ts';

/**
 * Builds the target that runs the WebMCP tools directly
 * against a local RxCollection.
 */
export function getWebMCPTargetFromCollection(collection: RxCollection<any>): WebMCPTarget {
    const database = collection.database;
    return {
        databaseName: database.name,
        collectionName: collection.name,
        schemaVersion: collection.schema.version,
        primaryPath: collection.schema.primaryPath,
        jsonSchema: collection.schema.getJsonSchemaWithoutMeta(),
        awaitInSync: async () => {
            const replicationStates = getFromMapOrCreate(
                REPLICATION_STATE_BY_COLLECTION,
                collection,
                () => []
            );
            await Promise.all(
                replicationStates.map(replicationState => {
                    if (!replicationState.isStopped()) {
                        return replicationState.awaitInSync();
                    }
                })
            );
        },
        query: async (query: any) => {
            const docs = await collection.find(query).exec();
            return docs.map(d => d.toJSON());
        },
        count: async (query: any) => {
            return await collection.count(query).exec();
        },
        changesSince: async (limit: number, checkpoint?: any) => {
            return await getChangedDocumentsSince(collection.storageInstance, limit, checkpoint);
        },
        awaitChange: () => {
            const closedError = () => newRxError('COL21', {
                collection: collection.name,
                version: collection.schema.version
            });
            if (collection.closed) {
                return Promise.reject(closedError());
            }
            return new Promise<void>((res, rej) => {
                const onClose = () => {
                    sub.unsubscribe();
                    rej(closedError());
                };
                /**
                 * The event bulks of a collection also contain the writes
                 * to its local documents, which are not changes of the collection.
                 */
                const sub = collection.eventBulks$.pipe(
                    filter((bulk: RxChangeEventBulk<any>) => !bulk.isLocal),
                    first()
                ).subscribe(() => {
                    const index = collection.onClose.indexOf(onClose);
                    if (index >= 0) {
                        collection.onClose.splice(index, 1);
                    }
                    res();
                });
                collection.onClose.push(onClose);
            });
        },
        insert: async (document: any) => {
            const doc = await collection.insert(document);
            return doc.toJSON();
        },
        upsert: async (document: any) => {
            const doc = await collection.upsert(document);
            return doc.toJSON();
        },
        remove: async (id: string) => {
            const doc = await collection.findOne(id).exec();
            if (!doc) {
                return undefined;
            }
            const deletedDoc = await doc.remove();
            return deletedDoc.toJSON();
        },
        onClose: (fn: () => void) => {
            collection.onClose.push(fn);
        }
    };
}
