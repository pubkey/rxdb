import { Observable } from 'rxjs';

import { RxQuery } from '../../rx-query';
import {
    PouchReplicationOptions,
    PouchSyncHandler
} from '../pouch';

export declare class RxGraphQLReplicationState {
    recieved$: Observable<any>;
    send$: Observable<any>;
    error$: Observable<any>;
    canceled$: Observable<any>;
    active$: Observable<boolean>;
    initialReplicationComplete$: Observable<any>;

    isStopped(): boolean;
    awaitInitialReplication(): Promise<true>;

    run(): Promise<void>;
    cancel(): Promise<any>;

}

export type RxGraphQLReplicationQueryBuilder = (doc: any) => {
    query: string;
    variables: any;
};

export type SyncOptionsGraphQL = {
    url: string;
    headers?: { [k: string]: string }; // send with all requests to the endpoint
    waitForLeadership?: boolean; // default=true
    pull?: {
        queryBuilder: RxGraphQLReplicationQueryBuilder;
        modifier?: (doc: any) => any;
    };
    push?: {
        queryBuilder: RxGraphQLReplicationQueryBuilder;
        modifier?: (doc: any) => any;
        batchSize?: number;
    };
    deletedFlag: string;
    live?: boolean; // default=false
    liveInterval?: number; // time in ms
    retryTime?: number; // time in ms
    autoStart?: boolean; // if this is false, the replication does nothing at start
}
