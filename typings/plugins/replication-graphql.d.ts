import { Observable } from 'rxjs';

import { RxQuery } from '../rx-query.d';
import {
    PouchReplicationOptions,
    PouchSyncHandler
} from '../pouch';

export declare class RxGraphQlReplicationState {
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

export type SyncOptionsGraphQl = {
    url: string;
    headers?: { [k: string]: string }; // send with all requests to the endpoint
    waitForLeadership?: boolean; // default=true
    pull?: {
        queryBuilder: (doc: any) => string;
        modifier?: (doc: any) => any;
    };
    push?: {
        modifier?: (doc: any) => any;
    };
    deletedFlag: string;
    live?: boolean; // default=false
    liveInterval?: number; // time in ms
    retryTime?: number; // time in ms
}
