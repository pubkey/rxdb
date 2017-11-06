import { Observable } from 'rxjs';
import {
    RxCollectionCreator,
    RxCollection
} from './rx-collection';

import {
    RxChangeEvent
} from './rx-change-event';

export interface RxDatabaseCreator {
    name: string;
    adapter: any;
    password?: string;
    multiInstance?: boolean;
    ignoreDuplicate?: boolean;
}

export declare class RxDatabase {
    name: string;
    token: string;
    multiInstance: boolean;
    password: string;
    collections: any;

    $: Observable<RxChangeEvent>;

    collection(args: RxCollectionCreator): Promise<RxCollection<any>>;
    destroy(): Promise<boolean>;
    dump(): Promise<any>;
    importDump(json: any): Promise<any>;
    remove(): Promise<any>;

    isLeader: boolean;

    /**
     * returns a promise which resolves when the instance becomes leader
     * @return {Promise<boolean>}
     */
    waitForLeadership(): Promise<boolean>;
}
