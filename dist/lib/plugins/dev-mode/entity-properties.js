"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rxCollectionProperties = rxCollectionProperties;
exports.rxDatabaseProperties = rxDatabaseProperties;
exports.rxDocumentProperties = rxDocumentProperties;

var _rxCollection = require("../../rx-collection");

var _rxDatabase = require("../../rx-database");

var _rxDocument = require("../../rx-document");

/**
 * returns all possible properties of a RxCollection-instance
 */
var _rxCollectionProperties;

function rxCollectionProperties() {
  if (!_rxCollectionProperties) {
    var pseudoInstance = new _rxCollection.RxCollectionBase();
    var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
    var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
    _rxCollectionProperties = [].concat(ownProperties, prototypeProperties);
  }

  return _rxCollectionProperties;
}
/**
 * returns all possible properties of a RxDatabase-instance
 */


var _rxDatabaseProperties;

function rxDatabaseProperties() {
  if (!_rxDatabaseProperties) {
    // TODO instead of using the pseudoInstance,
    // we should get the properties from the prototype of the class
    var pseudoInstance = new _rxDatabase.RxDatabaseBase('pseudoInstance', 'memory');
    var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
    var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
    _rxDatabaseProperties = [].concat(ownProperties, prototypeProperties);
    pseudoInstance.destroy();
  }

  return _rxDatabaseProperties;
}
/**
 * returns all possible properties of a RxDocument
 */


var pseudoConstructor = (0, _rxDocument.createRxDocumentConstructor)(_rxDocument.basePrototype);
var pseudoRxDocument = new pseudoConstructor();

var _rxDocumentProperties;

function rxDocumentProperties() {
  if (!_rxDocumentProperties) {
    var reserved = ['deleted', 'synced'];
    var ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
    var prototypeProperties = Object.getOwnPropertyNames(_rxDocument.basePrototype);
    _rxDocumentProperties = [].concat(ownProperties, prototypeProperties, reserved);
  }

  return _rxDocumentProperties;
}

//# sourceMappingURL=entity-properties.js.map