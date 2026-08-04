import type {
    RxCollection
} from '../../index.d.ts';
import type {
    WebMCPTarget
} from '../../types/plugins/webmcp.d.ts';
import { getFromMapOrCreate } from '../utils/index.ts';
import { REPLICATION_STATE_BY_COLLECTION } from '../replication/index.ts';
import { firstValueFrom } from 'rxjs';
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
        awaitChange: async () => {
            await firstValueFrom(collection.eventBulks$);
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
