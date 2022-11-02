import type { EventBulk, PouchBulkDocOptions, PouchBulkDocResultRow, PouchCheckpoint, PouchDBInstance, PouchWriteError, RxDocumentData, RxStorageChangeEvent } from '../../types';
import { Subject } from 'rxjs';
import type { ChangeEvent } from 'event-reduce-js';
declare type EmitData = {
    emitId: number;
    writeOptions: PouchBulkDocOptions;
    writeDocs: any[];
    writeResult: (PouchBulkDocResultRow | PouchWriteError)[];
    previousDocs: Map<string, any>;
    startTime: number;
    endTime: number;
};
declare type Emitter<RxDocType> = {
    subject: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, PouchCheckpoint>>;
};
export declare const EVENT_EMITTER_BY_POUCH_INSTANCE: Map<string, Emitter<any>>;
export declare function getCustomEventEmitterByPouch<RxDocType>(pouch: PouchDBInstance): Emitter<RxDocType>;
/**
 * PouchDB is like a minefield,
 * where stuff randomly does not work dependent on some conditions.
 * So instead of doing plain writes,
 * we hack into the bulkDocs() function
 * and adjust the behavior accordingly.
 */
export declare function addCustomEventsPluginToPouch(): void;
export declare function eventEmitDataToStorageEvents<RxDocType>(pouchDBInstance: PouchDBInstance, primaryPath: string, emitData: EmitData): Promise<RxStorageChangeEvent<RxDocumentData<RxDocType>>[]>;
export declare function changeEventToNormal<RxDocType>(pouchDBInstance: PouchDBInstance, primaryPath: string, change: ChangeEvent<RxDocumentData<RxDocType>>, startTime?: number, endTime?: number): RxStorageChangeEvent<RxDocumentData<RxDocType>>;
export {};
