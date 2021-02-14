import { Observable } from 'rxjs';

import type { RxQuery, RxCollection } from '../../types';
import {
    PouchReplicationOptions,
    PouchSyncHandler
} from '../pouch';

export declare class RxReplicationState {
    collection: RxCollection;

    change$: Observable<any>;
    docs$: Observable<any>;
    denied$: Observable<any>;
    active$: Observable<any>;
    alive$: Observable<boolean>;
    complete$: Observable<any>;
    error$: Observable<any>;

    /**
     * waits until the inital replication is done
     * and the client can be expected to have the same data as the server
     */
    awaitInitialReplication(): Promise<void>;

    // can be used for debuging or custom event-handling
    // will be set some time after sync() is called
    _pouchEventEmitterObject: PouchSyncHandler | null;
    cancel(): Promise<any>;

    // if you do a custom sync, put the thing you get back from pouch here
    setPouchEventEmitter(pouchSyncState: any): void;
}

export interface SyncOptions {
    remote: string | any;
    waitForLeadership?: boolean;
    direction?: {
        push?: boolean,
        pull?: boolean
    };
    // for options see https://pouchdb.com/api.html#replication
    options?: PouchReplicationOptions;
    query?: RxQuery<any, any>;
}
