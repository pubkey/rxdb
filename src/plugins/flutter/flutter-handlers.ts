import type { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs';
import type {
    MangoQuery,
    RxCollection,
    RxDatabase,
    RxDocument,
    RxReplicationPullStreamItem,
    RxReplicationWriteToMasterRow
} from '../../types/index.d.ts';
import { createRxDatabase } from '../../rx-database.ts';
import { newRxError } from '../../rx-error.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';
import { replicateRxCollection } from '../replication/index.ts';
import type { RxReplicationState } from '../replication/index.ts';
import {
    FLUTTER_METHOD_HANDLERS,
    callDart,
    jsErrorToFlutterError,
    sendToFlutter
} from './flutter-bridge.ts';
import type {
    CreateRxDatabaseFunctionType,
    FlutterCollectionCreator,
    FlutterDatabaseCreationParams
} from './flutter-types.ts';
import {
    flutterHashSha256,
    getRxStorageFlutterDefault
} from './flutter-sqlite.ts';

export const FLUTTER_DATABASES = new Map<string, RxDatabase>();
export const FLUTTER_SUBSCRIPTIONS = new Map<string, Subscription>();
export const FLUTTER_REPLICATIONS = new Map<string, RxReplicationState<any, any>>();

const META_FIELDS = ['_rev', '_meta', '_attachments'];

let customDatabaseCreator: CreateRxDatabaseFunctionType | undefined;
export function setCustomDatabaseCreator(creator: CreateRxDatabaseFunctionType) {
    customDatabaseCreator = creator;
}

function getDatabase(dbId: string): RxDatabase {
    const db = FLUTTER_DATABASES.get(dbId);
    if (!db) {
        throw newRxError('FL3', { args: { dbId } });
    }
    return db;
}
function getCollection(params: { db: string; col: string; }): RxCollection {
    const db = getDatabase(params.db);
    const collection = db.collections[params.col];
    if (!collection) {
        throw newRxError('FL3', { args: { dbId: params.db, collection: params.col } });
    }
    return collection;
}
function getReplication(rid: string): RxReplicationState<any, any> {
    const replication = FLUTTER_REPLICATIONS.get(rid);
    if (!replication) {
        throw newRxError('FL3', { args: { rid } });
    }
    return replication;
}

/**
 * Documents are sent to Dart with all meta fields
 * so that Dart can send them back for revision-based writes
 * like doc.patch() which must fail on conflicts.
 */
function docToJson(doc: RxDocument<any> | null | undefined): any {
    if (!doc) {
        return null;
    }
    return doc._data;
}

function getQuery(collection: RxCollection, params: { op: string; query?: MangoQuery<any>; ids?: string[]; }) {
    switch (params.op) {
        case 'find':
            return collection.find(params.query);
        case 'findOne':
            return collection.findOne(params.query);
        case 'count':
            return collection.count(params.query);
        case 'findByIds':
            return collection.findByIds(params.ids as string[]);
        default:
            throw newRxError('FL2', { args: { op: params.op } });
    }
}
function queryResultToJson(op: string, result: any): any {
    switch (op) {
        case 'find':
            return (result as RxDocument[]).map(d => docToJson(d));
        case 'findOne':
            return docToJson(result);
        case 'count':
            return result;
        case 'findByIds': {
            const ret: any = {};
            (result as Map<string, RxDocument>).forEach((doc, id) => {
                ret[id] = docToJson(doc);
            });
            return ret;
        }
        default:
            throw newRxError('FL2', { args: { op } });
    }
}

function getCachedDoc(collection: RxCollection, docData: any): RxDocument<any> {
    return (collection as any)._docCache.getCachedRxDocument(docData);
}
async function getLatestDoc(collection: RxCollection, id: string): Promise<RxDocument<any>> {
    const doc = await collection.findOne(id).exec(true);
    return doc;
}

/**
 * Runs a modify function that is defined on the Dart side.
 * Dart gets the document data without meta fields
 * and the meta fields are added back afterwards.
 */
function dartModifier(modifierId: string) {
    return async (docData: any) => {
        const plain: any = Object.assign({}, docData);
        META_FIELDS.forEach(f => delete plain[f]);
        const result = await callDart('modifier.run', {
            mid: modifierId,
            data: plain
        });
        const ret = Object.assign({}, result);
        META_FIELDS.forEach(f => {
            if (typeof docData[f] !== 'undefined') {
                ret[f] = docData[f];
            }
        });
        return ret;
    };
}

function writeResultToJson(result: { success: RxDocument<any>[]; error: any[]; }) {
    return {
        success: result.success.map(d => docToJson(d)),
        error: result.error.map(err => {
            const ret: any = Object.assign({}, err);
            delete ret.writeRow;
            ret.documentInDb = err.documentInDb;
            return ret;
        })
    };
}

function addCollectionsFromFlutter(db: RxDatabase, dbId: string, collections: { [name: string]: FlutterCollectionCreator; }) {
    const creators: any = {};
    Object.entries(collections).forEach(([name, creator]) => {
        const migrationStrategies: any = {};
        (creator.migrationStrategyVersions || []).forEach(version => {
            migrationStrategies[version] = (oldDoc: any) => callDart('migration.run', {
                db: dbId,
                col: name,
                version,
                doc: oldDoc
            });
        });
        creators[name] = {
            schema: creator.schema,
            migrationStrategies,
            autoMigrate: creator.autoMigrate,
            localDocuments: creator.localDocuments
        };
    });
    return db.addCollections(creators);
}

function collectionsMeta(db: RxDatabase) {
    const ret: any = {};
    Object.entries(db.collections).forEach(([name, collection]) => {
        ret[name] = {
            primaryPath: collection.schema.primaryPath,
            schema: collection.schema.jsonSchema
        };
    });
    return ret;
}

function getLocalTarget(params: { db: string; col?: string; }): any {
    if (params.col) {
        return getCollection(params as any);
    }
    return getDatabase(params.db);
}

function getSubscriptionObservable(params: any): Observable<any> {
    switch (params.kind) {
        case 'query': {
            const collection = getCollection(params);
            const query = getQuery(collection, params);
            return query.$.pipe(map(result => queryResultToJson(params.op, result)));
        }
        case 'collection':
            return getCollection(params).$;
        case 'database':
            return getDatabase(params.db).$;
        case 'local':
            return getLocalTarget(params).getLocal$(params.id).pipe(
                map((doc: any) => doc ? doc._data.data : null)
            );
        case 'replication': {
            const replication = getReplication(params.rid);
            switch (params.stream) {
                case 'received':
                    return replication.received$;
                case 'sent':
                    return replication.sent$;
                case 'error':
                    return replication.error$.pipe(map(err => jsErrorToFlutterError(err)));
                case 'active':
                    return replication.active$;
                case 'canceled':
                    return replication.canceled$;
                default:
                    throw newRxError('FL2', { args: { stream: params.stream } });
            }
        }
        default:
            throw newRxError('FL2', { args: { kind: params.kind } });
    }
}

export function registerFlutterMethodHandlers() {
    const handlers: { [method: string]: (params: any) => any; } = {
        'bridge.version': () => RXDB_VERSION,

        /**
         * Database
         */
        'db.create': async (params: FlutterDatabaseCreationParams) => {
            let db: RxDatabase;
            if (customDatabaseCreator) {
                db = await customDatabaseCreator(params.name, params, {
                    storage: getRxStorageFlutterDefault()
                });
            } else {
                db = await createRxDatabase({
                    name: params.name,
                    storage: getRxStorageFlutterDefault(),
                    multiInstance: params.multiInstance ? true : false,
                    eventReduce: params.eventReduce === false ? false : true,
                    ignoreDuplicate: params.ignoreDuplicate,
                    closeDuplicates: params.closeDuplicates,
                    localDocuments: params.localDocuments,
                    allowSlowCount: params.allowSlowCount,
                    hashFunction: flutterHashSha256 as any
                });
            }
            FLUTTER_DATABASES.set(params.dbId, db);
            return {
                name: db.name,
                token: db.token,
                collections: collectionsMeta(db)
            };
        },
        'db.addCollections': async (params: { db: string; collections: any; }) => {
            const db = getDatabase(params.db);
            await addCollectionsFromFlutter(db, params.db, params.collections);
            return collectionsMeta(db);
        },
        'db.close': async (params: { db: string; }) => {
            const db = getDatabase(params.db);
            const ret = await db.close();
            FLUTTER_DATABASES.delete(params.db);
            return ret;
        },
        'db.remove': async (params: { db: string; }) => {
            const db = getDatabase(params.db);
            await db.remove();
            FLUTTER_DATABASES.delete(params.db);
        },
        'db.exportJSON': (params: { db: string; }) => getDatabase(params.db).exportJSON(),
        'db.importJSON': (params: { db: string; json: any; }) => getDatabase(params.db).importJSON(params.json),

        /**
         * Collection
         */
        'col.insert': async (params: { db: string; col: string; data: any; }) => docToJson(
            await getCollection(params).insert(params.data)
        ),
        'col.insertIfNotExists': async (params: { db: string; col: string; data: any; }) => docToJson(
            await getCollection(params).insertIfNotExists(params.data)
        ),
        'col.bulkInsert': async (params: { db: string; col: string; docs: any[]; }) => writeResultToJson(
            await getCollection(params).bulkInsert(params.docs)
        ),
        'col.upsert': async (params: { db: string; col: string; data: any; }) => docToJson(
            await getCollection(params).upsert(params.data)
        ),
        'col.incrementalUpsert': async (params: { db: string; col: string; data: any; }) => docToJson(
            await getCollection(params).incrementalUpsert(params.data)
        ),
        'col.bulkUpsert': async (params: { db: string; col: string; docs: any[]; }) => writeResultToJson(
            await getCollection(params).bulkUpsert(params.docs)
        ),
        'col.bulkRemove': async (params: { db: string; col: string; ids: string[]; }) => writeResultToJson(
            await getCollection(params).bulkRemove(params.ids)
        ),
        'col.remove': async (params: { db: string; col: string; }) => {
            await getCollection(params).remove();
        },
        'col.exportJSON': (params: { db: string; col: string; }) => getCollection(params).exportJSON(),
        'col.importJSON': (params: { db: string; col: string; json: any; }) => getCollection(params).importJSON(params.json),

        /**
         * Query
         */
        'query.exec': async (params: any) => {
            const collection = getCollection(params);
            const result = await getQuery(collection, params).exec();
            return queryResultToJson(params.op, result);
        },
        'query.remove': async (params: any) => {
            const collection = getCollection(params);
            const result = await (getQuery(collection, params) as any).remove();
            return queryResultToJson(params.op, result);
        },
        'query.patch': async (params: any) => {
            const collection = getCollection(params);
            const result = await (getQuery(collection, params) as any).patch(params.patch);
            return queryResultToJson(params.op, result);
        },
        'query.incrementalPatch': async (params: any) => {
            const collection = getCollection(params);
            const result = await (getQuery(collection, params) as any).incrementalPatch(params.patch);
            return queryResultToJson(params.op, result);
        },
        'query.update': async (params: any) => {
            const collection = getCollection(params);
            const result = await (getQuery(collection, params) as any).update(params.update);
            return queryResultToJson(params.op, result);
        },

        /**
         * Document
         * Methods that need the exact revision get the full document data,
         * incremental methods only get the primary key.
         */
        'doc.patch': async (params: any) => docToJson(
            await getCachedDoc(getCollection(params), params.data).patch(params.patch)
        ),
        'doc.incrementalPatch': async (params: any) => docToJson(
            await (await getLatestDoc(getCollection(params), params.id)).incrementalPatch(params.patch)
        ),
        'doc.update': async (params: any) => docToJson(
            await getCachedDoc(getCollection(params), params.data).update(params.update)
        ),
        'doc.incrementalUpdate': async (params: any) => docToJson(
            await (await getLatestDoc(getCollection(params), params.id)).incrementalUpdate(params.update)
        ),
        'doc.modify': async (params: any) => docToJson(
            await getCachedDoc(getCollection(params), params.data).modify(dartModifier(params.mid))
        ),
        'doc.incrementalModify': async (params: any) => docToJson(
            await (await getLatestDoc(getCollection(params), params.id)).incrementalModify(dartModifier(params.mid))
        ),
        'doc.remove': async (params: any) => docToJson(
            await getCachedDoc(getCollection(params), params.data).remove()
        ),
        'doc.incrementalRemove': async (params: any) => docToJson(
            await (await getLatestDoc(getCollection(params), params.id)).incrementalRemove()
        ),

        /**
         * Local documents, on the database when no collection is given.
         */
        'local.insert': async (params: any) => {
            const doc = await getLocalTarget(params).insertLocal(params.id, params.data);
            return doc._data.data;
        },
        'local.upsert': async (params: any) => {
            const doc = await getLocalTarget(params).upsertLocal(params.id, params.data);
            return doc._data.data;
        },
        'local.get': async (params: any) => {
            const doc = await getLocalTarget(params).getLocal(params.id);
            return doc ? doc._data.data : null;
        },
        'local.remove': async (params: any) => {
            const doc = await getLocalTarget(params).getLocal(params.id);
            if (doc) {
                await doc.remove();
            }
        },

        /**
         * Subscriptions
         */
        'sub.start': (params: any) => {
            const sid: string = params.sid;
            const observable = getSubscriptionObservable(params);
            const sub = observable.subscribe({
                next: (v: any) => sendToFlutter({ t: 'evt', s: sid, v: v === undefined ? null : v }),
                error: (err: any) => sendToFlutter({ t: 'evt', s: sid, e: jsErrorToFlutterError(err) }),
                complete: () => sendToFlutter({ t: 'evt', s: sid, c: 1 })
            });
            FLUTTER_SUBSCRIPTIONS.set(sid, sub);
        },
        'sub.stop': (params: { sid: string; }) => {
            const sub = FLUTTER_SUBSCRIPTIONS.get(params.sid);
            if (sub) {
                sub.unsubscribe();
                FLUTTER_SUBSCRIPTIONS.delete(params.sid);
            }
        },

        /**
         * Replication
         * The pull and push handlers and the pull stream are implemented in Dart.
         */
        'replication.create': (params: any) => {
            const rid: string = params.rid;
            const collection = getCollection(params);
            const replicationState = replicateRxCollection<any, any>({
                replicationIdentifier: params.replicationIdentifier,
                collection,
                deletedField: params.deletedField,
                live: params.live,
                retryTime: params.retryTime,
                autoStart: params.autoStart,
                waitForLeadership: params.waitForLeadership ? true : false,
                toggleOnDocumentVisible: false,
                pull: params.pull ? {
                    batchSize: params.pull.batchSize,
                    initialCheckpoint: params.pull.initialCheckpoint,
                    handler: (checkpoint: any, batchSize: number) => callDart('replication.pull', {
                        rid,
                        checkpoint: checkpoint === undefined ? null : checkpoint,
                        batchSize
                    })
                } : undefined,
                push: params.push ? {
                    batchSize: params.push.batchSize,
                    initialCheckpoint: params.push.initialCheckpoint,
                    handler: (rows: RxReplicationWriteToMasterRow<any>[]) => callDart('replication.push', {
                        rid,
                        rows
                    })
                } : undefined
            });
            FLUTTER_REPLICATIONS.set(rid, replicationState);
        },
        'replication.emit': (params: { rid: string; item: RxReplicationPullStreamItem<any, any>; }) => {
            getReplication(params.rid).emitEvent(params.item);
        },
        'replication.call': async (params: { rid: string; method: string; }) => {
            const replication = getReplication(params.rid);
            switch (params.method) {
                case 'start':
                    return replication.start();
                case 'pause':
                    return replication.pause();
                case 'reSync':
                    return replication.reSync();
                case 'awaitInitialReplication':
                    return replication.awaitInitialReplication();
                case 'awaitInSync':
                    return replication.awaitInSync();
                case 'isStopped':
                    return replication.isStopped();
                case 'isPaused':
                    return replication.isPaused();
                case 'cancel':
                    await replication.cancel();
                    FLUTTER_REPLICATIONS.delete(params.rid);
                    return;
                case 'remove':
                    await replication.remove();
                    FLUTTER_REPLICATIONS.delete(params.rid);
                    return;
                default:
                    throw newRxError('FL2', { args: { method: params.method } });
            }
        }
    };

    Object.entries(handlers).forEach(([method, handler]) => {
        FLUTTER_METHOD_HANDLERS.set(method, handler);
    });
}
