import type {
    WebMCPOptions,
    WebMCPLogEvent,
    WebMCPTarget,
    WebMCPTool
} from '../../types/plugins/webmcp.d.ts';
import { Subject } from 'rxjs';
import { newRxError } from '../../rx-error.ts';
import { NOSQL_QUERY_JSON_SCHEMA } from './nosql-query-schema.ts';

export const WEBMCP_ERROR_DOCS_HINT = 'Note: If this tool returns an error code, you can find the decoded error message at https://rxdb.info/errors.html';

/**
 * Resolves the WebMCP registry to register the tools at.
 * The specification moved the entrypoint from navigator to document,
 * so both are checked. Passing options.modelContext explicitly is
 * required when the tools must be registered at a registry of
 * another document, like inside an iframe or a devtools panel.
 */
export function getModelContext(options?: WebMCPOptions): any {
    if (options && options.modelContext) {
        return options.modelContext;
    }
    if (typeof document !== 'undefined' && (document as any).modelContext) {
        return (document as any).modelContext;
    }
    if (typeof navigator !== 'undefined' && (navigator as any).modelContext) {
        return (navigator as any).modelContext;
    }
    return undefined;
}

/**
 * Builds the WebMCP tool definitions for a given target.
 * The returned tools only talk to the target, so the same
 * definitions work for a local RxCollection and for a
 * collection that lives in another process or on another device.
 */
export function getWebMCPTools(
    target: WebMCPTarget,
    options?: WebMCPOptions,
    log$?: Subject<WebMCPLogEvent>,
    error$?: Subject<Error>
): WebMCPTool[] {
    const toolNameSuffix = `${target.databaseName}_${target.collectionName}_${target.schemaVersion}`;
    const schemaString = JSON.stringify(target.jsonSchema);

    const withMiddleware = (toolName: string, fn: (args: any, context: any) => Promise<any>) => {
        return async (args: any, context: any) => {
            try {
                const result = await fn(args, context);
                if (log$) {
                    log$.next({
                        collectionName: target.collectionName,
                        databaseName: target.databaseName,
                        toolName,
                        args,
                        result
                    });
                }
                return result;
            } catch (err: any) {
                if (error$) {
                    error$.next(err);
                }
                if (log$) {
                    log$.next({
                        collectionName: target.collectionName,
                        databaseName: target.databaseName,
                        toolName,
                        args,
                        error: err
                    });
                }
                throw err;
            }
        };
    };

    const awaitSyncIfRequired = async () => {
        if (options?.awaitReplicationsInSync !== false) {
            await target.awaitInSync();
        }
    };

    const queryInputSchema = () => ({
        type: 'object',
        $defs: NOSQL_QUERY_JSON_SCHEMA.$defs,
        properties: {
            query: Object.assign({}, NOSQL_QUERY_JSON_SCHEMA, {
                $defs: undefined,
                default: {
                    sort: [{ [target.primaryPath]: 'asc' }]
                }
            })
        },
        required: ['query']
    });

    const documentInputSchema = (description: string) => ({
        type: 'object',
        properties: {
            document: Object.assign({}, JSON.parse(schemaString), {
                description
            })
        },
        required: ['document']
    });

    const tools: WebMCPTool[] = [];

    const queryToolName = `rxdb_query_${toolNameSuffix}`;
    tools.push({
        name: queryToolName,
        description: `Query the RxDB collection '${target.collectionName}' of database '${target.databaseName}'. Allows filtering, sorting, and pagination. Returns an array of matched document objects. The collection has the following JSON schema: ${schemaString}. ${WEBMCP_ERROR_DOCS_HINT}`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: queryInputSchema(),
        execute: withMiddleware(queryToolName, async (args: { query: any; }) => {
            await awaitSyncIfRequired();
            return await target.query(args.query);
        })
    });

    const countToolName = `rxdb_count_${toolNameSuffix}`;
    tools.push({
        name: countToolName,
        description: `Counts the documents in the RxDB collection '${target.collectionName}' of database '${target.databaseName}' matching a given query. The collection has the following JSON schema: ${schemaString}. ${WEBMCP_ERROR_DOCS_HINT}`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: queryInputSchema(),
        execute: withMiddleware(countToolName, async (args: { query: any; }) => {
            await awaitSyncIfRequired();
            const count = await target.count(args.query);
            return { count };
        })
    });

    const changesToolName = `rxdb_changes_${toolNameSuffix}`;
    tools.push({
        name: changesToolName,
        description: `Returns all changes of the RxDB collection '${target.collectionName}' of database '${target.databaseName}' since a given checkpoint. If no checkpoint is provided, starts from the oldest change. The collection has the following JSON schema: ${schemaString}. ${WEBMCP_ERROR_DOCS_HINT}`,
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
        execute: withMiddleware(changesToolName, async (args: { checkpoint?: any; limit?: number; }) => {
            await awaitSyncIfRequired();
            const limit = args.limit || 50;
            const changes = await target.changesSince(limit, args.checkpoint);
            return {
                documents: changes.documents.map((doc: any) => {
                    const cleaned = Object.assign({}, doc);
                    delete cleaned._meta;
                    delete cleaned._rev;
                    delete cleaned._attachments;
                    delete cleaned._deleted;
                    return cleaned;
                }),
                checkpoint: changes.checkpoint
            };
        })
    });

    const waitChangesToolName = `rxdb_wait_changes_${toolNameSuffix}`;
    tools.push({
        name: waitChangesToolName,
        description: `Waits until a new write event happens to the RxDB collection '${target.collectionName}' of database '${target.databaseName}'. Returns a promise that resolves when a change occurs. ${WEBMCP_ERROR_DOCS_HINT}`,
        annotations: {
            readOnlyHint: true
        },
        inputSchema: {
            type: 'object',
            properties: {}
        },
        execute: withMiddleware(waitChangesToolName, async () => {
            await target.awaitChange();
            return { success: true, message: 'A write event occurred in the collection.' };
        })
    });

    if (options?.readOnly === true) {
        return tools;
    }

    const insertToolName = `rxdb_insert_${toolNameSuffix}`;
    tools.push({
        name: insertToolName,
        description: `Insert a document into the RxDB collection '${target.collectionName}' of database '${target.databaseName}'. The collection has the following JSON schema: ${schemaString}. ${WEBMCP_ERROR_DOCS_HINT}`,
        inputSchema: documentInputSchema('The document to insert.'),
        execute: withMiddleware(insertToolName, async (args: { document: any; }) => {
            await awaitSyncIfRequired();
            return await target.insert(args.document);
        })
    });

    const upsertToolName = `rxdb_upsert_${toolNameSuffix}`;
    tools.push({
        name: upsertToolName,
        description: `Upsert a document into the RxDB collection '${target.collectionName}' of database '${target.databaseName}'. If a document with the same primary key exists, it will be overwritten. The collection has the following JSON schema: ${schemaString}. ${WEBMCP_ERROR_DOCS_HINT}`,
        inputSchema: documentInputSchema('The document to upsert.'),
        execute: withMiddleware(upsertToolName, async (args: { document: any; }) => {
            await awaitSyncIfRequired();
            return await target.upsert(args.document);
        })
    });

    const deleteToolName = `rxdb_delete_${toolNameSuffix}`;
    tools.push({
        name: deleteToolName,
        description: `Deletes a document by id from the RxDB collection '${target.collectionName}' of database '${target.databaseName}'. The collection has the following JSON schema: ${schemaString}. ${WEBMCP_ERROR_DOCS_HINT}`,
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'The primary key of the document to delete.'
                }
            },
            required: ['id']
        },
        execute: withMiddleware(deleteToolName, async (args: { id: string; }) => {
            await awaitSyncIfRequired();
            const deletedDoc = await target.remove(args.id);
            if (!deletedDoc) {
                throw newRxError('WMCP1', {
                    documentId: args.id
                });
            }
            return deletedDoc;
        })
    });

    return tools;
}

/**
 * Registers the WebMCP tools of a target at the model context
 * and returns a function that unregisters them again.
 */
export function registerWebMCPTarget(
    target: WebMCPTarget,
    options?: WebMCPOptions
): {
    error$: Subject<Error>;
    log$: Subject<WebMCPLogEvent>;
    unregister: () => void;
} {
    const error$ = new Subject<Error>();
    const log$ = new Subject<WebMCPLogEvent>();
    const modelContext = getModelContext(options);
    if (!modelContext) {
        return { error$, log$, unregister: () => { } };
    }

    const tools = getWebMCPTools(target, options, log$, error$);

    /**
     * Tools are unregistered by aborting the signal they were registered with.
     * Registries that do not support signals are served by unregisterTool().
     */
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    tools.forEach(tool => modelContext.registerTool(
        tool,
        controller ? { signal: controller.signal } : undefined
    ));

    const unregister = () => {
        if (controller) {
            controller.abort();
            return;
        }
        tools.forEach(tool => {
            try {
                if (modelContext.unregisterTool) {
                    modelContext.unregisterTool(tool.name);
                }
            } catch (err) { }
        });
    };
    target.onClose(unregister);

    return { error$, log$, unregister };
}
