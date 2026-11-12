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

type WebMCPTargetIdentity = Pick<WebMCPTarget, 'databaseName' | 'collectionName' | 'schemaVersion'>;

/**
 * All tool names of a target end with this suffix.
 * The parts are joined with a dot because a dot is allowed in a tool name
 * but cannot be part of a database or collection name. This ensures that
 * two different targets never get the same tool names.
 */
export function getWebMCPToolNameSuffix(target: WebMCPTargetIdentity): string {
    return `${target.databaseName}.${target.collectionName}.${target.schemaVersion}`;
}

/**
 * The targets that have their tools registered, by registry and tool name suffix.
 * A registry cannot hold two tools with the same name, so the tools
 * of a target can only be registered once at the same registry.
 */
const REGISTERED_TARGETS = new WeakMap<object, Map<string, WebMCPTargetIdentity>>();

/**
 * Throws when the tool names of the target are already
 * registered at the registry.
 * Call this before the first tool is registered so that
 * a failing registration does not leave a part of the tools behind.
 */
export function ensureWebMCPToolNamesNotRegistered(
    target: WebMCPTargetIdentity,
    options?: WebMCPOptions
) {
    const modelContext = getModelContext(options);
    const registered = modelContext ? REGISTERED_TARGETS.get(modelContext) : undefined;
    const toolNameSuffix = getWebMCPToolNameSuffix(target);
    if (registered && registered.has(toolNameSuffix)) {
        throw newRxError('WMCP2', {
            name: toolNameSuffix,
            database: target.databaseName,
            collection: target.collectionName
        });
    }
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
    const toolNameSuffix = getWebMCPToolNameSuffix(target);
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

    ensureWebMCPToolNamesNotRegistered(target, options);
    const toolNameSuffix = getWebMCPToolNameSuffix(target);
    let registered = REGISTERED_TARGETS.get(modelContext);
    if (!registered) {
        registered = new Map();
        REGISTERED_TARGETS.set(modelContext, registered);
    }
    registered.set(toolNameSuffix, target);
    const registeredTargets = registered;

    const tools = getWebMCPTools(target, options, log$, error$);

    /**
     * Tools are unregistered by aborting the signal they were registered with.
     * A registry can ignore the signal and only offer unregisterTool(),
     * and it is not detectable which one it honors, so both are used.
     */
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    /**
     * Only the tools that the registry accepted are unregistered,
     * a rejected name can belong to a tool of someone else.
     * A tool is accepted when registerTool() returned and,
     * when it returned a promise, after that promise has resolved.
     */
    const registeredTools: WebMCPTool[] = [];
    const unregisterTool = (tool: WebMCPTool) => {
        try {
            if (modelContext.unregisterTool) {
                modelContext.unregisterTool(tool.name);
            }
        } catch (err) { }
    };
    let unregistered = false;
    const unregister = () => {
        /**
         * A second call must not remove the tool names
         * or the tools of a later registration with the same names.
         */
        if (unregistered) {
            return;
        }
        unregistered = true;
        if (registeredTargets.get(toolNameSuffix) === target) {
            registeredTargets.delete(toolNameSuffix);
        }
        if (controller) {
            controller.abort();
        }
        registeredTools.splice(0).forEach(unregisterTool);
    };

    /**
     * A registration that fails must not leave a part of its tools
     * or its tool names behind, so that it can be run again.
     */
    try {
        tools.forEach(tool => {
            const registration = modelContext.registerTool(
                tool,
                controller ? { signal: controller.signal } : undefined
            );
            /**
             * Spec-conformant registries return a promise that rejects
             * with the abort reason when the tool is unregistered
             * before the registration has finished.
             */
            if (registration && typeof registration.then === 'function') {
                registration.then(() => {
                    /**
                     * A registry that ignores the signal still adds a tool
                     * whose registration was pending during unregister().
                     */
                    if (unregistered) {
                        unregisterTool(tool);
                    } else {
                        registeredTools.push(tool);
                    }
                }, (err: any) => {
                    if (controller && controller.signal.aborted && err === controller.signal.reason) {
                        return;
                    }
                    unregister();
                    error$.next(err);
                });
            } else {
                registeredTools.push(tool);
            }
        });
    } catch (err) {
        unregister();
        throw err;
    }
    target.onClose(unregister);

    return { error$, log$, unregister };
}
