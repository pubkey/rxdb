/**
 * a buffer-cache which holds the last X changeEvents of the collection
 */
import {
    Subscription
} from 'rxjs';
import { filter } from 'rxjs/operators';
import type {
    RxChangeEvent,
    RxCollection
} from './types/index.d.ts';
import {
    appendToArray,
    requestIdlePromiseNoQueue
} from './plugins/utils/index.ts';

/**
 * This buffer rembemers previous change events
 * so that queries can use them on .exec()
 * to calculate the new result set via event-reduce instead
 * of running the query against the storage.
 */
export class ChangeEventBuffer<RxDocType> {
    /**
     * These properties are private to ensure they cannot
     * be read without first processing the lazy tasks.
     */
    private subs: Subscription[] = [];
    private counter: number = 0;
    private eventCounterMap: WeakMap<
        RxChangeEvent<RxDocType>, number
    > = new WeakMap();
    /**
     * array with changeEvents
     * starts with oldest known event, ends with newest
    */
    private buffer: RxChangeEvent<RxDocType>[] = [];

    public limit: number = 100;



    private tasks = new Set<Function>();

    constructor(
        public collection: RxCollection
    ) {
        this.subs.push(
            this.collection.database.eventBulks$.pipe(
                filter(changeEventBulk => changeEventBulk.collectionName === this.collection.name),
                filter(bulk => {
                    const first = bulk.events[0];
                    return !first.isLocal;
                })
            ).subscribe(eventBulk => {
                this.tasks.add(() => this._handleChangeEvents(eventBulk.events));
                if (this.tasks.size <= 1) {
                    requestIdlePromiseNoQueue().then(() => {
                        this.processTasks();
                    });
                }
            })
        );
    }

    private processTasks() {
        if (this.tasks.size === 0) {
            return;
        }
        const tasks = Array.from(this.tasks);
        tasks.forEach(task => task());
        this.tasks.clear();
    }

    private _handleChangeEvents(events: RxChangeEvent<RxDocType>[]) {
        const counterBefore = this.counter;
        this.counter = this.counter + events.length;
        if (events.length > this.limit) {
            this.buffer = events.slice(events.length * -1);
        } else {
            appendToArray(this.buffer, events);
            this.buffer = this.buffer.slice(this.limit * -1);
        }
        const counterBase = counterBefore + 1;
        const eventCounterMap = this.eventCounterMap;
        for (let index = 0; index < events.length; index++) {
            const event = events[index];
            eventCounterMap.set(event, counterBase + index);
        }
    }

    getCounter() {
        this.processTasks();
        return this.counter;
    }
    getBuffer() {
        this.processTasks();
        return this.buffer;
    }

    /**
     * gets the array-index for the given pointer
     * @return arrayIndex which can be used to iterate from there. If null, pointer is out of lower bound
     */
    getArrayIndexByPointer(pointer: number): number | null {
        this.processTasks();
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
     * @return array with change-events. If null, pointer out of bounds
     */
    getFrom(pointer: number): RxChangeEvent<RxDocType>[] | null {
        this.processTasks();
        const ret = [];
        let currentIndex = this.getArrayIndexByPointer(pointer);
        if (currentIndex === null) // out of bounds
            return null;

        while (true) {
            const nextEvent = this.buffer[currentIndex];
            currentIndex++;
            if (!nextEvent) {
                return ret;
            } else {
                ret.push(nextEvent);
            }
        }
    }

    runFrom(pointer: number, fn: Function) {
        this.processTasks();
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
    reduceByLastOfDoc(changeEvents: RxChangeEvent<RxDocType>[]): RxChangeEvent<RxDocType>[] {
        this.processTasks();
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

    destroy() {
        this.tasks.clear();
        this.subs.forEach(sub => sub.unsubscribe());
    }
}

export function createChangeEventBuffer<RxdocType>(
    collection: RxCollection<RxdocType, any>
) {
    return new ChangeEventBuffer<RxdocType>(collection);
}
