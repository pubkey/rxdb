import type { RxChangeEvent, RxCollection } from './types/index.d.ts';
export declare class ChangeEventBuffer<RxDocType> {
    collection: RxCollection;
    private subs;
    limit: number;
    counter: number;
    private eventCounterMap;
    /**
     * array with changeEvents
     * starts with oldest known event, ends with newest
     */
    buffer: RxChangeEvent<RxDocType>[];
    constructor(collection: RxCollection);
    _handleChangeEvent(changeEvent: RxChangeEvent<RxDocType>): void;
    /**
     * gets the array-index for the given pointer
     * @return arrayIndex which can be used to iterate from there. If null, pointer is out of lower bound
     */
    getArrayIndexByPointer(pointer: number): number | null;
    /**
     * get all changeEvents which came in later than the pointer-event
     * @return array with change-events. If null, pointer out of bounds
     */
    getFrom(pointer: number): RxChangeEvent<RxDocType>[] | null;
    runFrom(pointer: number, fn: Function): void;
    /**
     * no matter how many operations are done on one document,
     * only the last operation has to be checked to calculate the new state
     * this function reduces the events to the last ChangeEvent of each doc
     */
    reduceByLastOfDoc(changeEvents: RxChangeEvent<RxDocType>[]): RxChangeEvent<RxDocType>[];
    destroy(): void;
}
export declare function createChangeEventBuffer<RxdocType>(collection: RxCollection<RxdocType, any>): ChangeEventBuffer<RxdocType>;
