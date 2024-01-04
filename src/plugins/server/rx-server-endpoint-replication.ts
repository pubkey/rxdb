import { getQueryMatcher, normalizeMangoQuery } from '../../rx-query-helper.ts';
import type {
    FilledMangoQuery,
    RxCollection,
    RxReplicationHandler,
    RxReplicationWriteToMasterRow,
    StringKeys
} from '../../types';
import { getReplicationHandlerByCollection } from '../replication-websocket/index.ts';
import type { RxServer } from './rx-server.ts';
import { IncomingHttpHeaders } from 'http';
import type {
    RxServerAuthenticationData,
    RxServerChangeValidator,
    RxServerEndpoint,
    RxServerQueryModifier
} from './types.ts';
import { filter, map } from 'rxjs';
import { ensureNotFalsy } from '../utils/index.ts';
import { getChangedDocumentsSinceQuery } from '../../rx-storage-helper.ts';
import { prepareQuery } from '../../rx-query.ts';
import WebSocket from "ws";

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
        while (v < collection.schema.version) {
            const version = v;
            // TODO
            // this.server.expressApp.get('/' + [this.type, collection.name, version].join('/'), { websocket: true }, connection => {
            //     closeConnection(connection, 426, 'Outdated version ' + version + ' (newest is ' + collection.schema.version + ')');
            // });
            v++;
        }

        this.urlPath = [this.type, collection.name, collection.schema.version].join('/');
        const replicationHandler = getReplicationHandlerByCollection(this.server.database, collection.name);
        const authDataByWebsocket = new Map<WebSocket, RxServerAuthenticationData<AuthType>>();

        /**
         * @link https://cheatcode.co/tutorials/how-to-set-up-a-websocket-server-with-node-js-and-express
         */
        const websocketServer = new WebSocket.Server({
            noServer: true,
            path: '/' + this.urlPath,
        });
        this.server.httpServer.on("upgrade", (request, socket, head) => {
            websocketServer.handleUpgrade(request, socket, head, (websocket) => {
                websocketServer.emit("connection", websocket, request);
            });
        });
        websocketServer.on('connection', async (connection, connectionRequest) => {
            console.log('S: GOT CONNECTION');
            console.log(JSON.stringify(connectionRequest.headers));
            console.dir(connectionRequest.url);
            connection.on('error', () => {
                console.log('S: error');
            });
            connection.on('message', async (messagePlain) => {
                console.log('S: GOT MESSSAGE');
                const message: RxReplicationEndpointMessageType = JSON.parse(messagePlain.toString());
                console.dir(message);

                let authData = authDataByWebsocket.get(connection);
                if (!authData && message.method !== 'auth') {
                    console.error('UNAUTHORIZED');
                    closeConnection(connection, 401, 'Unauthorized');
                    return;
                }
                switch (message.method) {
                    case 'auth':
                        try {
                            authData = await this.server.authenticationHandler(message.params[0]);
                            authDataByWebsocket.set(connection, authData);
                        } catch (err) {
                            closeConnection(connection, 401, 'Unauthorized');
                            return;
                        }
                        break;
                    case 'masterChangeStream$':
                        const docDataMatcherStream = await getDocAllowedMatcher(this, ensureNotFalsy(authData));
                        replicationHandler.masterChangeStream$.pipe(
                            map(changes => {
                                if (changes === 'RESYNC') {
                                    return changes;
                                } else {
                                    const useDocs = changes.documents.filter(d => docDataMatcherStream(d));
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
                            connection.send(JSON.stringify(streamResponse));
                        });
                        break;
                    case 'masterChangesSince':
                        const plainQuery = getChangedDocumentsSinceQuery(
                            this.collection.storageInstance,
                            message.params[1],
                            message.params[0]
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
                        const response: RxReplicationEndpointResponseType = {
                            id: message.id,
                            result
                        };
                        connection.send(JSON.stringify(response));
                        break;
                    case 'masterWrite':
                        const docDataMatcherWrite = await getDocAllowedMatcher(this, ensureNotFalsy(authData));
                        const rows: RxReplicationWriteToMasterRow<RxDocType>[] = message.params[0];

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
                            closeConnection(connection, 403, 'Forbidden');
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
                            closeConnection(connection, 403, 'Forbidden');
                            return;
                        }

                        const resultWrite = await replicationHandler.masterWrite(rows);
                        const responseWrite: RxReplicationEndpointResponseType = {
                            id: message.id,
                            result: resultWrite
                        };
                        connection.send(JSON.stringify(responseWrite));
                        break;
                    default:
                        closeConnection(connection, 400, 'Bad Request');
                        break;
                }
            });
        });
    }


}



async function closeConnection(connection: WebSocket, code: number, message: string) {
    const responseWrite: RxReplicationEndpointResponseType = {
        id: 'error',
        result: {},
        error: {
            code,
            message
        }
    };
    await connection.send(JSON.stringify(responseWrite));
    await connection.close();
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
