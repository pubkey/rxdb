import type {
    RxCollection,
    RxDatabase
} from '../../index.d.ts';
import {
    matchesViewerSelector,
    VIEWER_INTERNAL_FIELDS
} from './dbviewer-helpers.ts';
import type {
    RxDBViewerDump
} from './dbviewer-types.ts';

export type ViewerCollectionInfo = {
    name: string;
    primaryPath: string;
    jsonSchema?: any;
    schemaVersion?: number;
};

export type ViewerQueryResult = {
    docs: any[];
    /**
     * Total number of matching documents,
     * null when the storage cannot count without
     * a full scan and allowSlowCount is not set.
     */
    total: number | null;
};

/**
 * The UI renders from this source so the same screens
 * work over a live RxDatabase and over a static dump file.
 */
export type ViewerDataSource = {
    kind: 'live' | 'dump';
    readOnly: boolean;
    databaseName: string;
    storageName: string;
    dumpFilename?: string;
    dumpTime?: number;
    rawDatabase?: RxDatabase;
    listCollections(): ViewerCollectionInfo[];
    count(collectionName: string, selector?: any): Promise<number | null>;
    query(collectionName: string, selector: any, skip: number, limit: number): Promise<ViewerQueryResult>;
    getById(collectionName: string, id: string): Promise<any | null>;
    upsert(collectionName: string, doc: any): Promise<void>;
    removeByIds(collectionName: string, ids: string[]): Promise<void>;
    exportCollection(collectionName: string): Promise<any>;
};

export function stripInternalFields(doc: any): any {
    const result: any = {};
    Object.keys(doc || {}).forEach(key => {
        if (!VIEWER_INTERNAL_FIELDS.includes(key)) {
            result[key] = doc[key];
        }
    });
    return result;
}

function getLiveCollection(database: RxDatabase, collectionName: string): RxCollection<any> {
    return (database.collections as any)[collectionName];
}

export function createLiveDataSource(database: RxDatabase): ViewerDataSource {
    return {
        kind: 'live',
        readOnly: false,
        databaseName: database.name,
        storageName: database.storage.name,
        rawDatabase: database,
        listCollections() {
            return Object.entries(database.collections)
                .filter(([name]) => !name.startsWith('_'))
                .map(([name, collection]) => ({
                    name,
                    primaryPath: String((collection as RxCollection<any>).schema.primaryPath),
                    jsonSchema: (collection as RxCollection<any>).schema.jsonSchema,
                    schemaVersion: (collection as RxCollection<any>).schema.version
                }));
        },
        async count(collectionName: string, selector?: any) {
            const collection = getLiveCollection(database, collectionName);
            if (!collection) {
                return null;
            }
            try {
                return await collection.count(selector ? { selector } : undefined).exec();
            } catch (err) {
                return null;
            }
        },
        async query(collectionName: string, selector: any, skip: number, limit: number) {
            const collection = getLiveCollection(database, collectionName);
            if (!collection) {
                return { docs: [], total: 0 };
            }
            const docs = await collection.find({
                selector,
                skip,
                limit
            }).exec();
            let total: number | null = null;
            try {
                total = await collection.count({ selector }).exec();
            } catch (err) {
                total = null;
            }
            return {
                docs: docs.map(doc => doc.toJSON(true)),
                total
            };
        },
        async getById(collectionName: string, id: string) {
            const collection = getLiveCollection(database, collectionName);
            if (!collection) {
                return null;
            }
            const doc = await collection.findOne(id).exec();
            return doc ? doc.toJSON(true) : null;
        },
        async upsert(collectionName: string, doc: any) {
            const collection = getLiveCollection(database, collectionName);
            await collection.upsert(stripInternalFields(doc));
        },
        async removeByIds(collectionName: string, ids: string[]) {
            const collection = getLiveCollection(database, collectionName);
            await collection.find({
                selector: {
                    [collection.schema.primaryPath as string]: {
                        $in: ids
                    }
                } as any
            }).remove();
        },
        async exportCollection(collectionName: string) {
            const collection = getLiveCollection(database, collectionName);
            if (typeof (collection as any).exportJSON === 'function') {
                return (collection as any).exportJSON();
            }
            const docs = await collection.find().exec();
            return {
                name: collectionName,
                docs: docs.map(doc => doc.toJSON(true))
            };
        }
    };
}

export function createDumpDataSource(
    dump: RxDBViewerDump,
    dumpFilename?: string
): ViewerDataSource {
    const collectionsByName = new Map<string, any[]>();
    (dump.collections || []).forEach(collection => {
        collectionsByName.set(collection.name, collection.docs || []);
    });
    const guessPrimaryPath = (docs: any[]): string => {
        const first = docs[0];
        if (!first) {
            return 'id';
        }
        if (typeof first.id !== 'undefined') {
            return 'id';
        }
        const firstUserKey = Object.keys(first).find(key => !VIEWER_INTERNAL_FIELDS.includes(key));
        return firstUserKey || 'id';
    };
    return {
        kind: 'dump',
        readOnly: true,
        databaseName: dump.name || 'dump',
        storageName: 'dump',
        dumpFilename,
        dumpTime: Date.now(),
        listCollections() {
            return Array.from(collectionsByName.entries()).map(([name, docs]) => ({
                name,
                primaryPath: guessPrimaryPath(docs)
            }));
        },
        async count(collectionName: string, selector?: any) {
            const docs = collectionsByName.get(collectionName) || [];
            if (!selector) {
                return docs.length;
            }
            return docs.filter(doc => matchesViewerSelector(doc, selector)).length;
        },
        async query(collectionName: string, selector: any, skip: number, limit: number) {
            const docs = collectionsByName.get(collectionName) || [];
            const matching = docs.filter(doc => matchesViewerSelector(doc, selector));
            return {
                docs: matching.slice(skip, skip + limit),
                total: matching.length
            };
        },
        async getById(collectionName: string, id: string) {
            const docs = collectionsByName.get(collectionName) || [];
            const primaryPath = guessPrimaryPath(docs);
            return docs.find(doc => String(doc[primaryPath]) === id) || null;
        },
        async upsert() {
            throw new Error('not available on a dump');
        },
        async removeByIds() {
            throw new Error('not available on a dump');
        },
        async exportCollection(collectionName: string) {
            return {
                name: collectionName,
                docs: collectionsByName.get(collectionName) || []
            };
        }
    };
}
