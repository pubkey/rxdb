/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */
import { RxDatabase, RxCollection } from './types';
export declare class RxChangeEvent {
    data: any;
    constructor(data: any);
    get hash(): string;
    private _hash;
    toJSON(): {
        col: null;
        doc: null;
        v: null;
        op: any;
        t: any;
        db: any;
        it: any;
        isLocal: any;
    };
    isIntern(): boolean;
    isSocket(): boolean;
}
export declare function changeEventfromJSON(data: any): RxChangeEvent;
export declare function changeEventfromPouchChange(changeDoc: any, collection: RxCollection): RxChangeEvent;
export declare function createChangeEvent(op: string, database: RxDatabase, collection?: RxCollection, doc?: any, value?: any, isLocal?: boolean): RxChangeEvent;
export declare function isInstanceOf(obj: any): boolean;
