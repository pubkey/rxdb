import type { FilledMangoQuery, RxDatabase, RxReplicationWriteToMasterRow } from '../../types';
import type { MaybePromise } from '../../types/util';
import { IncomingHttpHeaders } from 'http';
import { Express } from 'express';

export type RxServerOptions<AuthType> = {
    database: RxDatabase;
    authenticationHandler: RxServerAuthenticationHandler<AuthType>;
    serverApp?: Express;
    appOptions?: any;
    hostname: string;
    port: number;
    /**
     * Set a origin for allowed CORS requests.
     * Can be overwritten by the cors option of the endpoints.
     * [default='*']
     */
    cors?: '*' | string;
};

export type RxServerAuthenticationData<AuthType> = {
    data: AuthType;
    validUntil: number;
};

/**
 * Returns the authentication state by the given request headers.
 * Throws if authentication not valid.
 */
export type RxServerAuthenticationHandler<AuthType> =
    (headers: IncomingHttpHeaders) => MaybePromise<RxServerAuthenticationData<AuthType>>;

/**
 * Modifies a given query in a way to limit the results
 * to what the authenticated user is allowed to see.
 * For example the query selector
 * input: {
 *   selector: {
 *     myField: { $gt: 100 }
 *   }
 * }
 * could be modified to restrict the results to only return
 * documents that are "owned" by the user
 * return: {
 *   selector: {
 *     myField: { $gt: 100 },
 *     userId: { $eq: authData.userId }
 *   }
 * }
 */
export type RxServerQueryModifier<AuthType, RxDocType> = (
    authData: RxServerAuthenticationData<AuthType>,
    query: FilledMangoQuery<RxDocType>
) => MaybePromise<FilledMangoQuery<RxDocType>>;

/**
 * Validates if a given change is allowed to be performed on the server.
 * Returns true if allowed, false if not.
 * If a client tries to make a non-allowed change,
 * the client will be disconnected.
 */
export type RxServerChangeValidator<AuthType, RxDocType> = (
    authData: RxServerAuthenticationData<AuthType>,
    change: RxReplicationWriteToMasterRow<RxDocType>
) => MaybePromise<boolean>;


export interface RxServerEndpoint {
    type: 'replication';
    urlPath: string;
};
