"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ChangeEventBuffer = void 0;
exports.createChangeEventBuffer = createChangeEventBuffer;
var _operators = require("rxjs/operators");
var _index = require("./plugins/utils/index.js");
/**
 * a buffer-cache which holds the last X changeEvents of the collection
 */
/**
 * This buffer rembemers previous change events
 * so that queries can use them on .exec()
 * to calculate the new result set via event-reduce instead
 * of running the query against the storage.
 */
var ChangeEventBuffer = exports.ChangeEventBuffer = /*#__PURE__*/function () {
  /**
   * These properties are private to ensure they cannot
   * be read without first processing the lazy tasks.
   */

  /**
   * array with changeEvents
   * starts with oldest known event, ends with newest
  */

  function ChangeEventBuffer(collection) {
    this.subs = [];
    this.counter = 0;
    this.eventCounterMap = new WeakMap();
    this.buffer = [];
    this.limit = 100;
    this.tasks = new Set();
    this.collection = collection;
    this.subs.push(this.collection.eventBulks$.pipe((0, _operators.filter)(bulk => !bulk.isLocal)).subscribe(eventBulk => {
      this.tasks.add(() => this._handleChangeEvents(eventBulk.events));
      if (this.tasks.size <= 1) {
        (0, _index.requestIdlePromiseNoQueue)().then(() => {
          this.processTasks();
        });
      }
    }));
  }
  var _proto = ChangeEventBuffer.prototype;
  _proto.processTasks = function processTasks() {
    if (this.tasks.size === 0) {
      return;
    }
    var tasks = Array.from(this.tasks);
    tasks.forEach(task => task());
    this.tasks.clear();
  };
  _proto._handleChangeEvents = function _handleChangeEvents(events) {
    var counterBefore = this.counter;
    this.counter = this.counter + events.length;
    if (events.length > this.limit) {
      this.buffer = events.slice(events.length * -1);
    } else {
      (0, _index.appendToArray)(this.buffer, events);
      this.buffer = this.buffer.slice(this.limit * -1);
    }
    var counterBase = counterBefore + 1;
    var eventCounterMap = this.eventCounterMap;
    for (var index = 0; index < events.length; index++) {
      var event = events[index];
      eventCounterMap.set(event, counterBase + index);
    }
  };
  _proto.getCounter = function getCounter() {
    this.processTasks();
    return this.counter;
  };
  _proto.getBuffer = function getBuffer() {
    this.processTasks();
    return this.buffer;
  }

  /**
   * gets the array-index for the given pointer
   * @return arrayIndex which can be used to iterate from there. If null, pointer is out of lower bound
   */;
  _proto.getArrayIndexByPointer = function getArrayIndexByPointer(pointer) {
    this.processTasks();
    var oldestEvent = this.buffer[0];
    var oldestCounter = this.eventCounterMap.get(oldestEvent);
    if (pointer < oldestCounter) return null; // out of bounds

    var rest = pointer - oldestCounter;
    return rest;
  }

  /**
   * get all changeEvents which came in later than the pointer-event
   * @return array with change-events. If null, pointer out of bounds
   */;
  _proto.getFrom = function getFrom(pointer) {
    this.processTasks();
    var ret = [];
    var currentIndex = this.getArrayIndexByPointer(pointer);
    if (currentIndex === null)
      // out of bounds
      return null;
    while (true) {
      var nextEvent = this.buffer[currentIndex];
      currentIndex++;
      if (!nextEvent) {
        return ret;
      } else {
        ret.push(nextEvent);
      }
    }
  };
  _proto.runFrom = function runFrom(pointer, fn) {
    this.processTasks();
    var ret = this.getFrom(pointer);
    if (ret === null) {
      throw new Error('out of bounds');
    } else {
      ret.forEach(cE => fn(cE));
    }
  }

  /**
   * no matter how many operations are done on one document,
   * only the last operation has to be checked to calculate the new state
   * this function reduces the events to the last ChangeEvent of each doc.
   * This functionality is currently disabled. It is questionable if
   * pre-merging the events would really be faster or actually slower.
   */;
  _proto.reduceByLastOfDoc = function reduceByLastOfDoc(changeEvents) {
    this.processTasks();
    return changeEvents.slice(0);
  };
  _proto.close = function close() {
    this.tasks.clear();
    this.subs.forEach(sub => sub.unsubscribe());
  };
  return ChangeEventBuffer;
}();
function createChangeEventBuffer(collection) {
  return new ChangeEventBuffer(collection);
}
//# sourceMappingURL=change-event-buffer.js.map