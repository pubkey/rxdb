import { Observable } from 'rxjs';

import { RxQuery } from '../rx-query.d';
import {
    PouchReplicationOptions,
    PouchSyncHandler
} from '../pouch';

export declare class RxReplicationState {
    change$: Observable<any>;
    docs$: Observable<any>;
    denied$: Observable<any>;
    active$: Observable<any>;
    alive$: Observable<boolean>;
    complete$: Observable<any>;
    error$: Observable<any>;
    cancel(): Promise<any>;

    // if you do a custom sync, put the thing you get back from pouch here
    setPouchEventEmitter(pouchSyncState: any): void;

    // can be used for debuging or custom event-handling
    // will be set some time after sync() is called
    _pouchEventEmitterObject: PouchSyncHandler | null;
}

export interface SyncOptions {
    remote: string | any,
    waitForLeadership?: boolean,
    direction?: {
        push?: boolean,
        pull?: boolean
    },
    // for options see https://pouchdb.com/api.html#replication
    options?: PouchReplicationOptions,
    query?: RxQuery<any, any>
}
