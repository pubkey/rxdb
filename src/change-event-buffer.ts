/**
 * a buffer-cache which holds the last X changeEvents of the collection
 */
import {
    Subscription
} from 'rxjs';
import type {
    RxCollection
} from './types';
import {
    RxChangeEvent
} from './rx-change-event';

export class ChangeEventBuffer {
    private subs: Subscription[] = [];
    public limit: number = 100;
    public counter: number = 0;
    private eventCounterMap: WeakMap<
        RxChangeEvent, number
    > = new WeakMap();

    /**
     * array with changeEvents
     * starts with oldest known event, ends with newest
     */
    public buffer: RxChangeEvent[] = [];

    constructor(
        public collection: RxCollection
    ) {
        this.subs.push(
            this.collection.$.subscribe((cE: any) => this._handleChangeEvent(cE))
        );
    }

    _handleChangeEvent(changeEvent: RxChangeEvent) {
        // console.log('changeEventBuffer()._handleChangeEvent()');
        this.counter++;
        this.buffer.push(changeEvent);
        this.eventCounterMap.set(changeEvent, this.counter);
        while (this.buffer.length > this.limit)
            this.buffer.shift();
    }

    /**
     * gets the array-index for the given pointer
     * @return arrayIndex which can be used to itterate from there. If null, pointer is out of lower bound
     */
    getArrayIndexByPointer(pointer: number): number | null {
        const oldestEvent = this.buffer[0];
        const oldestCounter = this.eventCounterMap.get(
            oldestEvent
        ) as number;

        if (pointer < oldestCounter)
            return null; // out of bounds

        const rest = pointer - oldestCounter;
        return rest;
    }

    /**
     * get all changeEvents which came in later than the pointer-event
     * @return array with change-events. Iif null, pointer out of bounds
     */
    getFrom(pointer: number): RxChangeEvent[] | null {
        const ret = [];
        let currentIndex = this.getArrayIndexByPointer(pointer);
        if (currentIndex === null) // out of bounds
            return null;

        while (true) {
            const nextEvent = this.buffer[currentIndex];
            currentIndex++;
            if (!nextEvent) return ret;
            else ret.push(nextEvent);
        }
    }

    runFrom(pointer: number, fn: Function) {
        const ret = this.getFrom(pointer);
        if (ret === null) {
            throw new Error('out of bounds');
        } else {
            ret.forEach(cE => fn(cE));
        }
    }

    /**
     * no matter how many operations are done on one document,
     * only the last operation has to be checked to calculate the new state
     * this function reduces the events to the last ChangeEvent of each doc
     */
    reduceByLastOfDoc(changeEvents: RxChangeEvent[]): RxChangeEvent[] {
        return changeEvents.slice(0);
        // TODO the old implementation was wrong
        // because it did not correctly reassigned the previousData of the changeevents
        // this should be added to the event-reduce library and not be done in RxDB
        const docEventMap: any = {};
        changeEvents.forEach(changeEvent => {
            docEventMap[changeEvent.documentId] = changeEvent;
        });
        return Object.values(docEventMap);
    }

    /**
     * use this to check if a change has already been handled
     * @returns true if change with revision exists
     *
     */
    hasChangeWithRevision(revision: string): boolean {
        // we loop from behind because its more likely that the searched event is at the end
        let t = this.buffer.length;
        while (t > 0) {
            t--;
            const cE = this.buffer[t];
            if (cE.documentData && cE.documentData._rev === revision) return true;
        }
        return false;
    }

    destroy() {
        this.subs.forEach(sub => sub.unsubscribe());
    }
}

export function createChangeEventBuffer(
    collection: RxCollection
) {
    return new ChangeEventBuffer(collection);
}
