/**
 * a buffer-cache which holds the last X changeEvents of the collection
 * TODO this could be optimized to only store the last event of one document
 */
class ChangeEventBuffer {
    constructor(collection) {
        this.collection = collection;
        this.subs = [];
        this.limit = 100;

        /**
         * array with changeEvents
         * starts with oldest known event, ends with newest
         * @type {RxChangeEvent[]}
         */
        this.buffer = [];
        this.counter = 0;
        this.eventCounterMap = new WeakMap();

        this.subs.push(
            this.collection.$.subscribe(cE => this._handleChangeEvent(cE))
        );
    }

    _handleChangeEvent(changeEvent) {
        // console.log('changeEventBuffer()._handleChangeEvent()');
        this.counter++;
        this.buffer.push(changeEvent);
        this.eventCounterMap.set(changeEvent, this.counter);
        while (this.buffer.length > this.limit)
            this.buffer.shift();
    }

    /**
     * gets the array-index for the given pointer
     * @param  {number} pointer
     * @return {number|null} arrayIndex which can be used to itterate from there. If null, pointer is out of lower bound
     */
    getArrayIndexByPointer(pointer) {
        const oldestEvent = this.buffer[0];
        const oldestCounter = this.eventCounterMap.get(oldestEvent);

        if (pointer < oldestCounter)
            return null; // out of bounds

        const rest = pointer - oldestCounter;
        return rest;
    }

    /**
     * get all changeEvents which came in later than the pointer-event
     * @param  {number} pointer
     * @return {RxChangeEvent[]|null} array with change-events. Iif null, pointer out of bounds
     */
    getFrom(pointer) {
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

    runFrom(pointer, fn) {
        this.getFrom(pointer).forEach(cE => fn(cE));
    }

    /**
     * no matter how many operations are done on one document,
     * only the last operation has to be checked to calculate the new state
     * this function reduces the events to the last ChangeEvent of each doc
     * @param {ChangeEvent[]} changeEvents
     * @return {ChangeEvents[]}
     */
    reduceByLastOfDoc(changeEvents) {
        const docEventMap = {};
        changeEvents.forEach(changeEvent => {
            docEventMap[changeEvent.data.doc] = changeEvent;
        });
        return Object.values(docEventMap);
    }

    destroy() {
        this.subs.forEach(sub => sub.unsubscribe());
    }
}

export function create(collection) {
    return new ChangeEventBuffer(collection);
}

export default {
    create
};
