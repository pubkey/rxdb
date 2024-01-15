import { getQueryMatcher, normalizeMangoQuery } from '../../rx-query-helper.ts';
import type {
    FilledMangoQuery,
    RxCollection,
    RxReplicationHandler,
    RxReplicationWriteToMasterRow,
    RxStorageDefaultCheckpoint,
    StringKeys
} from '../../types';
import { getReplicationHandlerByCollection } from '../replication-websocket/index.ts';
import type { RxServer } from './rx-server.ts';
import type {
    RxServerAuthenticationData,
    RxServerChangeValidator,
    RxServerEndpoint,
    RxServerQueryModifier
} from './types.ts';
import { filter, map } from 'rxjs';
import {
    ensureNotFalsy,
    getFromMapOrThrow,
    lastOfArray
} from '../utils/index.ts';
import { getChangedDocumentsSinceQuery } from '../../rx-storage-helper.ts';
import { prepareQuery } from '../../rx-query.ts';

import type {
    Request,
    Response,
    NextFunction
} from 'express';

export type RxReplicationEndpointMessageType = {
    id: string;
    method: StringKeys<RxReplicationHandler<any, any>> | 'auth';
    params: any[];
};

export type RxReplicationEndpointResponseType = {
    id: string;
    result: any;
    error?: {
        code: number;
        message: string;
    }
};


export class RxServerReplicationEndpoint<AuthType, RxDocType> implements RxServerEndpoint {
    readonly type = 'replication';
    readonly urlPath: string;
    constructor(
        public readonly server: RxServer<AuthType>,
        public readonly collection: RxCollection<RxDocType>,
        public readonly queryModifier: RxServerQueryModifier<AuthType, RxDocType>,
        public readonly changeValidator: RxServerChangeValidator<AuthType, RxDocType>
    ) {
        /**
         * "block" the previous version urls and send a 426 on them so that
         * the clients know they must update.
         */
        let v = 0;
        const outdatedUrls = new Set<string>();
        while (v < collection.schema.version) {
            const version = v;
            this.server.expressApp.get('/' + [this.type, collection.name, version].join('/'), (req, res) => {
                closeConnection(res, 426, 'Outdated version ' + version + ' (newest is ' + collection.schema.version + ')');
            });
            v++;
        }

        this.urlPath = [this.type, collection.name, collection.schema.version].join('/');

        console.log('SERVER URL PATH: ' + this.urlPath);

        const replicationHandler = getReplicationHandlerByCollection(this.server.database, collection.name);

        const authDataByRequest = new WeakMap<Request, RxServerAuthenticationData<AuthType>>();


        async function authenticate(req: Request, res: Response, next: NextFunction) {
            console.log('-- AUTH 1');
            try {
                const authData = await server.authenticationHandler(req.headers);
                authDataByRequest.set(req, authData);
                console.log('-- AUTH 2');
                next();
            } catch (err) {
                console.log('-- AUTH ERR');
                closeConnection(res, 401, 'Unauthorized');
                return;
            }
            console.log('-- AUTH 3');

        }
        this.server.expressApp.all('/' + this.urlPath + '/*', authenticate, function (req, res, next) {
            console.log('-- ALL 1');

            next();
        });

        this.server.expressApp.get('/' + this.urlPath + '/pull', async (req, res) => {
            console.log('-- PULL 1');
            const authData = getFromMapOrThrow(authDataByRequest, req);
            const id = req.query.id ? req.query.id as string : '';
            const lwt = req.query.lwt ? parseInt(req.query.lwt as any, 10) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit as any, 10) : 1;
            const plainQuery = getChangedDocumentsSinceQuery<RxDocType, RxStorageDefaultCheckpoint>(
                this.collection.storageInstance,
                limit,
                { id, lwt }
            );
            const useQueryChanges: FilledMangoQuery<RxDocType> = await this.queryModifier(
                ensureNotFalsy(authData),
                plainQuery
            );
            const prepared = prepareQuery<RxDocType>(
                this.collection.schema.jsonSchema,
                useQueryChanges
            );
            const result = await this.collection.storageInstance.query(prepared);
            const documents = result.documents;
            const newCheckpoint = documents.length === 0 ? { id, lwt } : {
                id: ensureNotFalsy(lastOfArray(documents))[this.collection.schema.primaryPath],
                updatedAt: ensureNotFalsy(lastOfArray(documents))._meta.lwt
            };
            res.setHeader('Content-Type', 'application/json');
            res.json({
                documents,
                checkpoint: newCheckpoint
            });
        });
        this.server.expressApp.post('/' + this.urlPath + '/push', async (req, res) => {
            const authData = getFromMapOrThrow(authDataByRequest, req);
            const docDataMatcherWrite = await getDocAllowedMatcher(this, ensureNotFalsy(authData));
            const rows: RxReplicationWriteToMasterRow<RxDocType>[] = req.body;

            console.log('body:');
            console.dir(req.body);

            // ensure all writes are allowed
            const nonAllowedRow = rows.find(row => {
                if (
                    !docDataMatcherWrite(row.newDocumentState as any) ||
                    (row.assumedMasterState && !docDataMatcherWrite(row.assumedMasterState as any))
                ) {
                    return true;
                }
            });
            if (nonAllowedRow) {
                closeConnection(res, 403, 'Forbidden');
                return;
            }
            let hasInvalidChange = false;
            await Promise.all(
                rows.map(async (row) => {
                    const isChangeValid = await this.changeValidator(ensureNotFalsy(authData), row);
                    if (!isChangeValid) {
                        hasInvalidChange = true;
                    }
                })
            );
            if (hasInvalidChange) {
                closeConnection(res, 403, 'Forbidden');
                return;
            }

            const conflicts = await replicationHandler.masterWrite(rows);
            res.setHeader('Content-Type', 'application/json');
            res.json(conflicts);
        });
        this.server.expressApp.get('/' + this.urlPath + '/pullStream', async (req, res) => {
            const authData = getFromMapOrThrow(authDataByRequest, req);
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            });

            const docDataMatcherStream = await getDocAllowedMatcher(this, ensureNotFalsy(authData));
            const subscription = replicationHandler.masterChangeStream$.pipe(
                map(changes => {
                    if (changes === 'RESYNC') {
                        return changes;
                    } else {
                        const useDocs = changes.documents.filter(d => docDataMatcherStream(d as any));
                        return {
                            documents: useDocs,
                            checkpoint: changes.checkpoint
                        };
                    }
                }),
                filter(f => f === 'RESYNC' || f.documents.length > 0)
            ).subscribe(filteredAndModified => {
                const streamResponse: RxReplicationEndpointResponseType = {
                    id: 'stream',
                    result: filteredAndModified
                };
                res.write('data: ' + JSON.stringify(streamResponse));
            });
            req.on('close', () => subscription.unsubscribe());
        });
    }
}


async function closeConnection(response: Response, code: number, message: string) {
    console.log('# CLOSE CONNECTION');
    const responseWrite: RxReplicationEndpointResponseType = {
        id: 'error',
        result: {},
        error: {
            code,
            message
        }
    };

    response.statusCode = code;
    await response.write(JSON.stringify(responseWrite));
    response.set("Connection", "close");
    response.end();
}

async function getDocAllowedMatcher<RxDocType, AuthType>(
    endpoint: RxServerReplicationEndpoint<any, RxDocType>,
    authData: RxServerAuthenticationData<AuthType>
) {
    const useQuery: FilledMangoQuery<RxDocType> = await endpoint.queryModifier(
        authData,
        normalizeMangoQuery(
            endpoint.collection.schema.jsonSchema,
            {}
        )
    );
    const docDataMatcher = getQueryMatcher(endpoint.collection.schema.jsonSchema, useQuery);
    return docDataMatcher;
}
