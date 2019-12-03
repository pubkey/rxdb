import { Observable } from 'rxjs';
import { RxQuery } from '../../types';
import { PouchReplicationOptions, PouchSyncHandler } from '../pouch';
export declare class RxReplicationState {
    change$: Observable<any>;
    docs$: Observable<any>;
    denied$: Observable<any>;
    active$: Observable<any>;
    alive$: Observable<boolean>;
    complete$: Observable<any>;
    error$: Observable<any>;
    _pouchEventEmitterObject: PouchSyncHandler | null;
    cancel(): Promise<any>;
    setPouchEventEmitter(pouchSyncState: any): void;
}
export interface SyncOptions {
    remote: string | any;
    waitForLeadership?: boolean;
    direction?: {
        push?: boolean;
        pull?: boolean;
    };
    options?: PouchReplicationOptions;
    query?: RxQuery<any, any>;
}
