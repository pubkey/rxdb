"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.create = create;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

    _createClass(ChangeEventBuffer, [{
        key: "_handleChangeEvent",
        value: function _handleChangeEvent(changeEvent) {
            this.counter++;
            this.buffer.push(changeEvent);
            this.eventCounterMap.set(changeEvent, this.counter);
            while (this.buffer.length > this.limit) {
                this.buffer.shift();
            }
        }
    }, {
        key: "getArrayIndexByPointer",
        value: function getArrayIndexByPointer(pointer) {
            var oldestEvent = this.buffer[0];
            var oldestCounter = this.eventCounterMap.get(oldestEvent);

            if (pointer < oldestCounter) {
                throw new Error("\n\t\t\t\t\t\t\tpointer lower than lowest cache-pointer\n\t\t\t\t\t\t\t- wanted: " + pointer + "\n\t\t\t\t\t\t\t- oldest: " + oldestCounter + "\n\t\t\t\t\t\t\t");
            }

            var rest = pointer - oldestCounter;
            return rest;
        }
    }, {
        key: "getFrom",
        value: function getFrom(pointer) {
            var currentIndex = this.getArrayIndexByPointer(pointer);
            var ret = [];
            while (true) {
                var nextEvent = this.buffer[currentIndex];
                currentIndex++;
                if (!nextEvent) return ret;else ret.push(nextEvent);
            }
        }
    }, {
        key: "runFrom",
        value: function runFrom(pointer, fn) {
            this.getFrom(pointer).forEach(function (cE) {
                return fn(cE);
            });
        }

        /**
         * no matter how many operations are done on one document,
         * only the last operation has to be checked to calculate the new state
         * this function reduces the events to the last ChangeEvent of each doc
         * @param {ChangeEvent[]} changeEvents
         * @return {ChangeEvents[]}
         */

    }, {
        key: "reduceByLastOfDoc",
        value: function reduceByLastOfDoc(changeEvents) {
            var docEventMap = {};
            changeEvents.forEach(function (changeEvent) {
                docEventMap[changeEvent.data.doc] = changeEvent;
            });
            return Object.values(docEventMap);
        }
    }, {
        key: "destroy",
        value: function destroy() {
            this.subs.forEach(function (sub) {
                return sub.unsubscribe();
            });
        }
    }]);

    return ChangeEventBuffer;
}();

function create(collection) {
    return new ChangeEventBuffer(collection);
}
