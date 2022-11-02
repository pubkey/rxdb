import { Observable } from 'rxjs';

import type {
    RxQuery,
    RxCollection
} from '../../types';
import type {
    PouchReplicationOptions,
    PouchSyncHandler
} from '../pouch';
import type { RxCouchDBReplicationStateBase } from '../../plugins/replication-couchdb';

export declare class RxCouchDBReplicationState extends RxCouchDBReplicationStateBase {
    collection: RxCollection;

    change$: Observable<any>;
    docs$: Observable<any>;
    denied$: Observable<any>;
    active$: Observable<any>;
    alive$: Observable<boolean>;
    complete$: Observable<any>;
    error$: Observable<any>;

    /**
     * waits until the initial replication is done
     * and the client can be expected to have the same data as the server
     */
    awaitInitialReplication(): Promise<void>;

    // can be used for debugging or custom event-handling
    // will be set some time after sync() is called
    _pouchEventEmitterObject: PouchSyncHandler | null;

    // if you do a custom sync, put the thing you get back from pouch here
    setPouchEventEmitter(pouchSyncState: any): void;
}

export type SyncOptions = {
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
