import type { RxCollection, RxStorageChangeEvent } from './types/index.d.ts';
/**
 * This buffer rembemers previous change events
 * so that queries can use them on .exec()
 * to calculate the new result set via event-reduce instead
 * of running the query against the storage.
 */
export declare class ChangeEventBuffer<RxDocType> {
    collection: RxCollection;
    /**
     * These properties are private to ensure they cannot
     * be read without first processing the lazy tasks.
     */
    private subs;
    private counter;
    private eventCounterMap;
    /**
     * array with changeEvents
     * starts with oldest known event, ends with newest
    */
    private buffer;
    limit: number;
    private tasks;
    constructor(collection: RxCollection);
    private processTasks;
    private _handleChangeEvents;
    getCounter(): number;
    getBuffer(): RxStorageChangeEvent<RxDocType>[];
    /**
     * gets the array-index for the given pointer
     * @return arrayIndex which can be used to iterate from there. If null, pointer is out of lower bound
     */
    getArrayIndexByPointer(pointer: number): number | null;
    /**
     * get all changeEvents which came in later than the pointer-event
     * @return array with change-events. If null, pointer out of bounds
     */
    getFrom(pointer: number): RxStorageChangeEvent<RxDocType>[] | null;
    runFrom(pointer: number, fn: Function): void;
    /**
     * no matter how many operations are done on one document,
     * only the last operation has to be checked to calculate the new state
     * this function reduces the events to the last ChangeEvent of each doc.
     * This functionality is currently disabled. It is questionable if
     * pre-merging the events would really be faster or actually slower.
     */
    reduceByLastOfDoc(changeEvents: RxStorageChangeEvent<RxDocType>[]): RxStorageChangeEvent<RxDocType>[];
    close(): void;
}
export declare function createChangeEventBuffer<RxdocType>(collection: RxCollection<RxdocType, any>): ChangeEventBuffer<RxdocType>;
