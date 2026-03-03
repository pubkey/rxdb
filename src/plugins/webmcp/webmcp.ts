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
    const collections = this.collections;
    const error$ = new Subject<Error>();
    const log$ = new Subject<WebMCPLogEvent>();

    const registerCollection = (collection: RxCollection<any>) => {
        const res = collection.registerWebMCP(options);
        res.error$.subscribe(error$);
        res.log$.subscribe(log$);
    };

    // Register existing collections
    for (const [name, collection] of Object.entries(collections)) {
        registerCollection(collection as RxCollection<any>);
    }

    // Store options and subjects on the database instance so the hook can pick them up dynamically
    (database as any)._webmcpOptions = options || {};
    (database as any)._webmcpError$ = error$;
    (database as any)._webmcpLog$ = log$;

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

    const queryToolName = `rxdb_query_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`;
    register({
        name: queryToolName,
        description: `Query the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. Allows filtering, sorting, and pagination. Returns an array of matched document objects. The collection has the following JSON schema: ${JSON.stringify(collection.schema.getJsonSchemaWithoutMeta())}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            $defs: NOSQL_QUERY_JSON_SCHEMA.$defs,
            properties: {
                query: Object.assign({}, NOSQL_QUERY_JSON_SCHEMA, {
                    $defs: undefined, // remove nested $defs
                    default: {
                        sort: [{ [collection.schema.primaryPath]: 'asc' }]
                    }
                })
            },
            required: ['query']
        },
        execute: withMiddleware(queryToolName, async (args: { query: any }, _context: any) => {
            await awaitSyncIfRequired();
            const docs = await collection.find(args.query).exec();
            return docs.map(d => d.toJSON());
        })
    });

    const countToolName = `rxdb_count_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`;
    register({
        name: countToolName,
        description: `Counts the documents in the RxDB collection '${collection.name}' of database '${(collection as any).database.name}' matching a given query. The collection has the following JSON schema: ${JSON.stringify(collection.schema.getJsonSchemaWithoutMeta())}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            $defs: NOSQL_QUERY_JSON_SCHEMA.$defs,
            properties: {
                query: Object.assign({}, NOSQL_QUERY_JSON_SCHEMA, {
                    $defs: undefined, // remove nested $defs
                    default: {
                        sort: [{ [collection.schema.primaryPath]: 'asc' }]
                    }
                })
            },
            required: ['query']
        },
        execute: withMiddleware(countToolName, async (args: { query: any }, _context: any) => {
            await awaitSyncIfRequired();
            const count = await collection.count(args.query).exec();
            return { count };
        })
    });

    const changesToolName = `rxdb_changes_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`;
    register({
        name: changesToolName,
        description: `Returns all changes of the RxDB collection '${collection.name}' of database '${(collection as any).database.name}' since a given checkpoint. If no checkpoint is provided, starts from the oldest change. The collection has the following JSON schema: ${JSON.stringify(collection.schema.getJsonSchemaWithoutMeta())}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
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
        execute: withMiddleware(changesToolName, async (args: { checkpoint?: any; limit?: number }, _context: any) => {
            await awaitSyncIfRequired();
            const limit = args.limit || 50;
            const storageInstance = collection.storageInstance;
            const changes = await getChangedDocumentsSince(storageInstance, limit, args.checkpoint);
            return changes;
        })
    });

    const waitChangesToolName = `rxdb_wait_changes_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`;
    register({
        name: waitChangesToolName,
        description: `Waits until a new write event happens to the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. Returns a promise that resolves when a change occurs. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {}
        },
        execute: withMiddleware(waitChangesToolName, async (_args: any, _context: any) => {
            await firstValueFrom(collection.eventBulks$);
            return { success: true, message: 'A write event occurred in the collection.' };
        })
    });

    if (options?.readOnly !== true) {
        const insertToolName = `rxdb_insert_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`;
        register({
            name: insertToolName,
            description: `Insert a document into the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. The collection has the following JSON schema: ${JSON.stringify(collection.schema.getJsonSchemaWithoutMeta())}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
            inputSchema: {
                type: 'object',
                properties: {
                    document: Object.assign({}, JSON.parse(JSON.stringify(collection.schema.getJsonSchemaWithoutMeta())), {
                        description: 'The document to insert.',
                    })
                },
                required: ['document']
            },
            execute: withMiddleware(insertToolName, async (args: { document: any }, _context: any) => {
                await awaitSyncIfRequired();
                const doc = await collection.insert(args.document);
                return doc.toJSON();
            })
        });

        const upsertToolName = `rxdb_upsert_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`;
        register({
            name: upsertToolName,
            description: `Upsert a document into the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. If a document with the same primary key exists, it will be overwritten. The collection has the following JSON schema: ${JSON.stringify(collection.schema.getJsonSchemaWithoutMeta())}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
            inputSchema: {
                type: 'object',
                properties: {
                    document: Object.assign({}, JSON.parse(JSON.stringify(collection.schema.getJsonSchemaWithoutMeta())), {
                        description: 'The document to upsert.',
                    })
                },
                required: ['document']
            },
            execute: withMiddleware(upsertToolName, async (args: { document: any }, _context: any) => {
                await awaitSyncIfRequired();
                const doc = await collection.upsert(args.document);
                return doc.toJSON();
            })
        });

        const deleteToolName = `rxdb_delete_${(collection as any).database.name}_${collection.name}_${collection.schema.version}`;
        register({
            name: deleteToolName,
            description: `Deletes a document by id from the RxDB collection '${collection.name}' of database '${(collection as any).database.name}'. The collection has the following JSON schema: ${JSON.stringify(collection.schema.getJsonSchemaWithoutMeta())}. Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html`,
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
            execute: withMiddleware(deleteToolName, async (args: { id: string }, _context: any) => {
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
    },
    hooks: {
        createRxCollection: {
            after: ({ collection }: { collection: RxCollection }) => {
                const db = collection.database as any;
                if (db._webmcpOptions) {
                    const res = (collection as any).registerWebMCP(db._webmcpOptions);
                    if (db._webmcpError$) {
                        res.error$.subscribe(db._webmcpError$);
                    }
                    if (db._webmcpLog$) {
                        res.log$.subscribe(db._webmcpLog$);
                    }
                }
            }
        }
    }
};
