import { Observable } from 'rxjs';
import {
    RxCollectionCreator,
    RxCollection
} from './rx-collection';

import {
    RxLocalDocument
} from './rx-document';
import {
    RxChangeEvent
} from './rx-change-event';

export interface RxDatabaseCreator {
    name: string;
    adapter: any;
    password?: string;
    multiInstance?: boolean;
    ignoreDuplicate?: boolean;
    options?: any;
}

export declare class RxDatabase {
    readonly name: string;
    readonly token: string;
    readonly multiInstance: boolean;
    readonly password: string;
    readonly collections: any;
    options?: any;

    readonly $: Observable<RxChangeEvent>;

    collection(args: RxCollectionCreator): Promise<RxCollection<any>>;
    destroy(): Promise<boolean>;
    dump(): Promise<any>;
    importDump(json: any): Promise<any>;
    remove(): Promise<any>;

    readonly isLeader: boolean;

    insertLocal(id: string, data: any): Promise<RxLocalDocument<RxDatabase>>;
    upsertLocal(id: string, data: any): Promise<RxLocalDocument<RxDatabase>>;
    getLocal(id: string): Promise<RxLocalDocument<RxDatabase>>;

    /**
     * returns a promise which resolves when the instance becomes leader
     * @return {Promise<boolean>}
     */
    waitForLeadership(): Promise<boolean>;
}
