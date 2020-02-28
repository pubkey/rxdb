"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createChangeEventBuffer = createChangeEventBuffer;
exports.ChangeEventBuffer = void 0;

/**
 * a buffer-cache which holds the last X changeEvents of the collection
 * TODO this could be optimized to only store the last event of one document
 */
var ChangeEventBuffer = /*#__PURE__*/function () {
  /**
   * array with changeEvents
   * starts with oldest known event, ends with newest
   */
  function ChangeEventBuffer(collection) {
    var _this = this;

    this.subs = [];
    this.limit = 100;
    this.counter = 0;
    this.eventCounterMap = new WeakMap();
    this.buffer = [];
    this.collection = collection;
    this.subs.push(this.collection.$.subscribe(function (cE) {
      return _this._handleChangeEvent(cE);
    }));
  }

  var _proto = ChangeEventBuffer.prototype;

  _proto._handleChangeEvent = function _handleChangeEvent(changeEvent) {
    // console.log('changeEventBuffer()._handleChangeEvent()');
    this.counter++;
    this.buffer.push(changeEvent);
    this.eventCounterMap.set(changeEvent, this.counter);

    while (this.buffer.length > this.limit) {
      this.buffer.shift();
    }
  }
  /**
   * gets the array-index for the given pointer
   * @return arrayIndex which can be used to itterate from there. If null, pointer is out of lower bound
   */
  ;

  _proto.getArrayIndexByPointer = function getArrayIndexByPointer(pointer) {
    var oldestEvent = this.buffer[0];
    var oldestCounter = this.eventCounterMap.get(oldestEvent);
    if (pointer < oldestCounter) return null; // out of bounds

    var rest = pointer - oldestCounter;
    return rest;
  }
  /**
   * get all changeEvents which came in later than the pointer-event
   * @return array with change-events. Iif null, pointer out of bounds
   */
  ;

  _proto.getFrom = function getFrom(pointer) {
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

  _proto.runFrom = function runFrom(pointer, fn) {
    var ret = this.getFrom(pointer);

    if (ret === null) {
      throw new Error('out of bounds');
    } else {
      ret.forEach(function (cE) {
        return fn(cE);
      });
    }
  }
  /**
   * no matter how many operations are done on one document,
   * only the last operation has to be checked to calculate the new state
   * this function reduces the events to the last ChangeEvent of each doc
   */
  ;

  _proto.reduceByLastOfDoc = function reduceByLastOfDoc(changeEvents) {
    var docEventMap = {};
    changeEvents.forEach(function (changeEvent) {
      docEventMap[changeEvent.data.doc] = changeEvent;
    });
    return Object.values(docEventMap);
  }
  /**
   * use this to check if a change has already been handled
   * @returns true if change with revision exists
   *
   */
  ;

  _proto.hasChangeWithRevision = function hasChangeWithRevision(revision) {
    // we loop from behind because its more likely that the searched event is at the end
    var t = this.buffer.length;

    while (t > 0) {
      t--;
      var cE = this.buffer[t];
      if (cE.data.v && cE.data.v._rev === revision) return true;
    }

    return false;
  };

  _proto.destroy = function destroy() {
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
  };

  return ChangeEventBuffer;
}();

exports.ChangeEventBuffer = ChangeEventBuffer;

function createChangeEventBuffer(collection) {
  return new ChangeEventBuffer(collection);
}

//# sourceMappingURL=change-event-buffer.js.map