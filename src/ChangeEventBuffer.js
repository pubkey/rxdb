/**
 * a bugger-cache which holds the last X changeEvents of the collection
 * TODO this could be refactored to only store the last event of one document
 */
class ChangeEventBuffer {
    constructor(collection) {
        this.collection = collection;

        this.subs = [];

        this.limit = 100;
        /**
         * array with changeEvents
         * starts with newest event, ends with oldest
         * @type {RxChangeEvent[]}
         */
        this.buffer = [];
        this.counter = 0;

        this.subs.push(
            this.collection.$.subscribe(cE => this._handleChangeEvent(cE))
        );
    }

    _handleChangeEvent(changeEvent) {
        this.counter++;
        this.buffer.unshift(changeEvent);
        while (this.buffer.length > this.limit)
            this.buffer.pop();
    }


    getArrayIndexByPointer(pointer) {
        if (pointer < (this.counter - this.limit) || pointer > this.counter)
            return null;

        return this.buffer.length - (this.counter - pointer);
    }

    getFrom(pointer) {
        const lowestCounter = this.counter - this.buffer.length;
        if (pointer < lowestCounter)
            return null;

        const ret = [];
        while (pointer < this.counter) {
            const index = this.getArrayIndexByPointer(pointer);
            const cE = this.buffer[index];
            ret.push(cE);
            pointer++;
        }
        return ret;
    }

    runFrom(pointer, fn) {
        const lowestCounter = this.counter - this.buffer.length;
        if (pointer < lowestCounter)
            throw new Error('pointer to low');

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
            if (!docEventMap[changeEvent.data.doc] ||
                docEventMap[changeEvent.data.doc].data.t < changeEvent.data.t
            ) docEventMap[changeEvent.data.doc] = changeEvent;
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
