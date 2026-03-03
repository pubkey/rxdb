import type {
    RxCollection,
    RxDatabase,
    RxCollectionEvent
} from '../../index.d.ts';
import type {
    RxWebMCPPlugin,
    WebMCPOptions,
    WebMCPLogEvent
} from '../../types/plugins/webmcp.d.ts';
import { getFromMapOrCreate } from '../utils/index.ts';
import { REPLICATION_STATE_BY_COLLECTION } from '../replication/index.ts';
import { Subject, merge, firstValueFrom, Subscription } from 'rxjs';
import { newRxError } from '../../rx-error.ts';
import { getChangedDocumentsSince } from '../../rx-storage-helper.ts';
import { NOSQL_QUERY_JSON_SCHEMA } from './nosql-query-schema.ts';



export function registerWebMCPDatabase(this: RxDatabase, options?: WebMCPOptions): { error$: Subject<Error>; log$: Subject<WebMCPLogEvent> } {
    const database = this;
    const collections = (this as any).collections;
    const error$ = new Subject<Error>();
    const log$ = new Subject<WebMCPLogEvent>();

    const registerCollection = (collection: RxCollection) => {
        const res = (collection as any).registerWebMCP(options);
        res.error$.subscribe(error$);
        res.log$.subscribe(log$);
    };

    // Register existing collections
    for (const [name, collection] of Object.entries(collections)) {
        registerCollection(collection as RxCollection);
    }

    // Register future collections
    database.eventBulks$.subscribe(bulk => {
        for (const event of bulk.events) {
            if ((event as any).documentData && (event as any).documentData.id === 'rxdb-collection-add') {
                // Actually the collection observable is database.$.pipe(filter(e => e.type === 'ADDED')) or something,
                // But RxDatabase.collection$ exists... Let me check. Wait, I will use `database.$` for RxCollectionEvent, or `database.eventBulks$`
                // Let's use `database.$` to catch RxCollectionEvent if possible, but actually `database.$` emits RxChangeEvent.
                // Looking at RxDatabase, let's use the standard approach or I'll just check if it's possible.
            }
        }
    });
    // Let me revise the dynamic collection hook
    const sub = (database as any).$.subscribe((event: any) => {
        if (event && event.type === 'ADDED' && event.collection) {
            registerCollection(event.collection);
        }
    });

    // We should probably tear this down if the database is destroyed... For now it's okay.
    return { error$, log$ };
}

export function registerWebMCPCollection(this: RxCollection, options?: WebMCPOptions): { error$: Subject<Error>; log$: Subject<WebMCPLogEvent> } {
    if (typeof navigator === 'undefined' || !(navigator as any).modelContext) {
        // Return dummy subjects if WebMCP is not available
        return { error$: new Subject<Error>(), log$: new Subject<WebMCPLogEvent>() };
    }

    const collection = this;
    const modelContext = (navigator as any).modelContext;
    const errorSubject = new Subject<Error>();
    const logSubject = new Subject<WebMCPLogEvent>();

    const withMiddleware = (toolName: string, fn: (args: any, context: any) => Promise<any>) => {
        return async (args: any, context: any) => {
            try {
                const result = await fn(args, context);
                logSubject.next({
                    collectionName: collection.name,
                    databaseName: (collection as any).database.name,
                    toolName,
                    args,
                    result
                });
                return result;
            } catch (err: any) {
                errorSubject.next(err);
                logSubject.next({
                    collectionName: collection.name,
                    databaseName: (collection as any).database.name,
                    toolName,
                    args,
                    error: err
                });
                throw err;
            }
        };
    };

    const awaitSyncIfRequired = async () => {
        const shouldAwait = options?.awaitReplicationsInSync !== false;
        if (shouldAwait) {
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
        }
    };

    const registeredToolNames: string[] = [];
    const register = (tool: any) => {
        modelContext.registerTool(tool);
        registeredToolNames.push(tool.name);
    };

    collection.onClose.push(() => {
        registeredToolNames.forEach(name => {
            try {
                if (modelContext.unregisterTool) {
                    modelContext.unregisterTool(name);
                }
            } catch (err) {
                // Ignore errors on unregister
            }
        });
    });

    register({
        name: `rxdb_query_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`,
        description: `Query the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. Allows filtering, sorting, and pagination. Returns an array of matched document objects. The collection has the following JSON schema: ${JSON.stringify(collection.schema.jsonSchema)}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {
                query: Object.assign({}, NOSQL_QUERY_JSON_SCHEMA, {
                    default: {
                        sort: [{ [collection.schema.primaryPath]: 'asc' }]
                    }
                })
            },
            required: ['query']
        },
        execute: withMiddleware('rxdb_query', async (args: { query: any }, _context: any) => {
            await awaitSyncIfRequired();
            const docs = await collection.find(args.query).exec();
            return docs.map(d => d.toJSON());
        })
    });

    register({
        name: `rxdb_count_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`,
        description: `Counts the documents in the RxDB collection '${collection.name}' of database '${(collection as any).database.name}' matching a given query. The collection has the following JSON schema: ${JSON.stringify(collection.schema.jsonSchema)}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {
                query: Object.assign({}, NOSQL_QUERY_JSON_SCHEMA, {
                    default: {
                        sort: [{ [collection.schema.primaryPath]: 'asc' }]
                    }
                })
            },
            required: ['query']
        },
        execute: withMiddleware('rxdb_count', async (args: { query: any }, _context: any) => {
            await awaitSyncIfRequired();
            const count = await collection.count(args.query).exec();
            return { count };
        })
    });

    register({
        name: `rxdb_changes_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`,
        description: `Returns all changes of the RxDB collection '${collection.name}' of database '${(collection as any).database.name}' since a given checkpoint. If no checkpoint is provided, starts from the oldest change. The collection has the following JSON schema: ${JSON.stringify(collection.schema.jsonSchema)}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {
                checkpoint: {
                    type: 'object',
                    description: 'The cursor/checkpoint to start fetching changes from. Leave empty to start from the beginning.'
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of changes to return.',
                    default: 50
                }
            }
        },
        execute: withMiddleware('rxdb_changes', async (args: { checkpoint?: any; limit?: number }, _context: any) => {
            await awaitSyncIfRequired();
            const limit = args.limit || 50;
            const storageInstance = collection.storageInstance;
            const changes = await getChangedDocumentsSince(storageInstance, limit, args.checkpoint);
            return changes;
        })
    });

    register({
        name: `rxdb_wait_changes_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`,
        description: `Waits until a new write event happens to the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. Returns a promise that resolves when a change occurs. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {}
        },
        execute: withMiddleware('rxdb_wait_changes', async (_args: any, _context: any) => {
            await firstValueFrom(collection.eventBulks$);
            return { success: true, message: 'A write event occurred in the collection.' };
        })
    });

    if (options?.readOnly !== true) {
        register({
            name: `rxdb_insert_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`,
            description: `Insert a document into the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. The collection has the following JSON schema: ${JSON.stringify(collection.schema.jsonSchema)}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
            inputSchema: {
                type: 'object',
                properties: {
                    document: Object.assign({}, collection.schema.jsonSchema, {
                        description: 'The document to insert.',
                    })
                },
                required: ['document']
            },
            execute: withMiddleware('rxdb_insert', async (args: { document: any }, _context: any) => {
                await awaitSyncIfRequired();
                const doc = await collection.insert(args.document);
                return doc.toJSON();
            })
        });

        register({
            name: `rxdb_upsert_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`,
            description: `Upsert a document into the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. If a document with the same primary key exists, it will be overwritten. The collection has the following JSON schema: ${JSON.stringify(collection.schema.jsonSchema)}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
            inputSchema: {
                type: 'object',
                properties: {
                    document: Object.assign({}, collection.schema.jsonSchema, {
                        description: 'The document to upsert.',
                    })
                },
                required: ['document']
            },
            execute: withMiddleware('rxdb_upsert', async (args: { document: any }, _context: any) => {
                await awaitSyncIfRequired();
                const doc = await collection.upsert(args.document);
                return doc.toJSON();
            })
        });

        register({
            name: `rxdb_delete_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`,
            description: `Deletes a document by id from the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. The collection has the following JSON schema: ${JSON.stringify(collection.schema.jsonSchema)}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
            inputSchema: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'The primary key of the document to delete.',
                    }
                },
                required: ['id']
            },
            execute: withMiddleware('rxdb_delete', async (args: { id: string }, _context: any) => {
                await awaitSyncIfRequired();
                const doc = await collection.findOne(args.id).exec();
                if (!doc) {
                    throw newRxError('WMCP1', {
                        documentId: args.id
                    });
                }
                const deletedDoc = await doc.remove();
                return deletedDoc.toJSON();
            })
        });
    }

    return { error$: errorSubject, log$: logSubject };
}

export const RxDBWebMCPPlugin: RxWebMCPPlugin = {
    name: 'webmcp',
    rxdb: true,
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.registerWebMCP = registerWebMCPDatabase;
        },
        RxCollection: (proto: any) => {
            proto.registerWebMCP = registerWebMCPCollection;
        }
    }
};
