import type { PouchBulkDocOptions, PouchBulkDocResultRow, PouchDBInstance, PouchWriteError } from '../../types';
import { Subject } from 'rxjs';
import { ObliviousSet } from 'oblivious-set';
declare type EmitData = {
    emitId: number;
    writeOptions: PouchBulkDocOptions;
    writeDocs: any[];
    writeResult: (PouchBulkDocResultRow | PouchWriteError)[];
    previousDocs: Map<string, any>;
    startTime: number;
    endTime: number;
};
declare type Emitter = {
    subject: Subject<EmitData>;
    /**
     * Contains all eventIds that of emitted events,
     * used because multi-instance pouchdbs often will reemit the same
     * event on the other browser tab.
     */
    obliviousSet: ObliviousSet<string>;
};
export declare const EVENT_EMITTER_BY_POUCH_INSTANCE: Map<string, Emitter>;
export declare function getCustomEventEmitterByPouch(pouch: PouchDBInstance): Emitter;
export declare function addCustomEventsPluginToPouch(): void;
export {};
