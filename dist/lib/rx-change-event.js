"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDocumentDataOfRxChangeEvent = getDocumentDataOfRxChangeEvent;
exports.isRxChangeEventIntern = isRxChangeEventIntern;
exports.rxChangeEventToEventReduceChangeEvent = rxChangeEventToEventReduceChangeEvent;

var _overwritable = require("./overwritable");

/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */
function getDocumentDataOfRxChangeEvent(rxChangeEvent) {
  if (rxChangeEvent.documentData) {
    return rxChangeEvent.documentData;
  } else {
    return rxChangeEvent.previousDocumentData;
  }
}

function isRxChangeEventIntern(rxChangeEvent) {
  if (rxChangeEvent.collectionName && rxChangeEvent.collectionName.charAt(0) === '_') {
    return true;
  } else {
    return false;
  }
}

function rxChangeEventToEventReduceChangeEvent(rxChangeEvent) {
  switch (rxChangeEvent.operation) {
    case 'INSERT':
      return {
        operation: rxChangeEvent.operation,
        id: rxChangeEvent.documentId,
        doc: rxChangeEvent.documentData,
        previous: null
      };

    case 'UPDATE':
      return {
        operation: rxChangeEvent.operation,
        id: rxChangeEvent.documentId,
        doc: _overwritable.overwritable.deepFreezeWhenDevMode(rxChangeEvent.documentData),
        previous: rxChangeEvent.previousDocumentData ? rxChangeEvent.previousDocumentData : 'UNKNOWN'
      };

    case 'DELETE':
      return {
        operation: rxChangeEvent.operation,
        id: rxChangeEvent.documentId,
        doc: null,
        previous: rxChangeEvent.previousDocumentData
      };
  }
}
//# sourceMappingURL=rx-change-event.js.map