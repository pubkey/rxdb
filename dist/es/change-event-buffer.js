import _classCallCheck from "babel-runtime/helpers/classCallCheck";

/**
 * a buffer-cache which holds the last X changeEvents of the collection
 * TODO this could be optimized to only store the last event of one document
 */
var ChangeEventBuffer = function () {
    function ChangeEventBuffer(collection) {
        var _this = this;

        _classCallCheck(this, ChangeEventBuffer);

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

        this.subs.push(this.collection.$.subscribe(function (cE) {
            return _this._handleChangeEvent(cE);
        }));
    }

    ChangeEventBuffer.prototype._handleChangeEvent = function _handleChangeEvent(changeEvent) {
        // console.log('changeEventBuffer()._handleChangeEvent()');
        this.counter++;
        this.buffer.push(changeEvent);
        this.eventCounterMap.set(changeEvent, this.counter);
        while (this.buffer.length > this.limit) {
            this.buffer.shift();
        }
    };

    /**
     * gets the array-index for the given pointer
     * @param  {number} pointer
     * @return {number|null} arrayIndex which can be used to itterate from there. If null, pointer is out of lower bound
     */


    ChangeEventBuffer.prototype.getArrayIndexByPointer = function getArrayIndexByPointer(pointer) {
        var oldestEvent = this.buffer[0];
        var oldestCounter = this.eventCounterMap.get(oldestEvent);

        if (pointer < oldestCounter) return null; // out of bounds

        var rest = pointer - oldestCounter;
        return rest;
    };

    /**
     * get all changeEvents which came in later than the pointer-event
     * @param  {number} pointer
     * @return {RxChangeEvent[]|null} array with change-events. Iif null, pointer out of bounds
     */


    ChangeEventBuffer.prototype.getFrom = function getFrom(pointer) {
        var ret = [];
        var currentIndex = this.getArrayIndexByPointer(pointer);
        if (currentIndex === null) // out of bounds
            return null;

        while (true) {
            var nextEvent = this.buffer[currentIndex];
            currentIndex++;
            if (!nextEvent) return ret;else ret.push(nextEvent);
        }
    };

    ChangeEventBuffer.prototype.runFrom = function runFrom(pointer, fn) {
        this.getFrom(pointer).forEach(function (cE) {
            return fn(cE);
        });
    };

    /**
     * no matter how many operations are done on one document,
     * only the last operation has to be checked to calculate the new state
     * this function reduces the events to the last ChangeEvent of each doc
     * @param {ChangeEvent[]} changeEvents
     * @return {ChangeEvents[]}
     */


    ChangeEventBuffer.prototype.reduceByLastOfDoc = function reduceByLastOfDoc(changeEvents) {
        var docEventMap = {};
        changeEvents.forEach(function (changeEvent) {
            docEventMap[changeEvent.data.doc] = changeEvent;
        });
        return Object.values(docEventMap);
    };

    ChangeEventBuffer.prototype.destroy = function destroy() {
        this.subs.forEach(function (sub) {
            return sub.unsubscribe();
        });
    };

    return ChangeEventBuffer;
}();

export function create(collection) {
    return new ChangeEventBuffer(collection);
}

export default {
    create: create
};