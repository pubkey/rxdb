import { RxCollectionBase } from '../../rx-collection';
import { RxDatabaseBase } from '../../rx-database';
import { createRxDocumentConstructor, basePrototype } from '../../rx-document';
/**
 * returns all possible properties of a RxCollection-instance
 */

var _rxCollectionProperties;

export function rxCollectionProperties() {
  if (!_rxCollectionProperties) {
    var pseudoInstance = new RxCollectionBase();
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

export function rxDatabaseProperties() {
  if (!_rxDatabaseProperties) {
    // TODO instead of using the pseudoInstance,
    // we should get the properties from the prototype of the class
    var pseudoInstance = new RxDatabaseBase('pseudoInstance', 'memory');
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

var pseudoConstructor = createRxDocumentConstructor(basePrototype);
var pseudoRxDocument = new pseudoConstructor();

var _rxDocumentProperties;

export function rxDocumentProperties() {
  if (!_rxDocumentProperties) {
    var reserved = ['deleted', 'synced'];
    var ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
    var prototypeProperties = Object.getOwnPropertyNames(basePrototype);
    _rxDocumentProperties = [].concat(ownProperties, prototypeProperties, reserved);
  }

  return _rxDocumentProperties;
}
//# sourceMappingURL=entity-properties.js.map