import type { RxCollection } from './types';
import { RxChangeEvent } from './rx-change-event';
export declare class ChangeEventBuffer {
    collection: RxCollection;
    private subs;
    limit: number;
    counter: number;
    private eventCounterMap;
    /**
     * array with changeEvents
     * starts with oldest known event, ends with newest
     */
    buffer: RxChangeEvent[];
    constructor(collection: RxCollection);
    _handleChangeEvent(changeEvent: RxChangeEvent): void;
    /**
     * gets the array-index for the given pointer
     * @return arrayIndex which can be used to itterate from there. If null, pointer is out of lower bound
     */
    getArrayIndexByPointer(pointer: number): number | null;
    /**
     * get all changeEvents which came in later than the pointer-event
     * @return array with change-events. Iif null, pointer out of bounds
     */
    getFrom(pointer: number): RxChangeEvent[] | null;
    runFrom(pointer: number, fn: Function): void;
    /**
     * no matter how many operations are done on one document,
     * only the last operation has to be checked to calculate the new state
     * this function reduces the events to the last ChangeEvent of each doc
     */
    reduceByLastOfDoc(changeEvents: RxChangeEvent[]): RxChangeEvent[];
    /**
     * use this to check if a change has already been handled
     * @returns true if change with revision exists
     *
     */
    hasChangeWithRevision(revision: string): boolean;
    destroy(): void;
}
export declare function createChangeEventBuffer(collection: RxCollection): ChangeEventBuffer;
