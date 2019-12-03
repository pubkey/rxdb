"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDocumentPrototype = getDocumentPrototype;
exports.getRxDocumentConstructor = getRxDocumentConstructor;
exports.createRxDocument = createRxDocument;
exports.createRxDocuments = createRxDocuments;
exports.getDocumentOrmPrototype = getDocumentOrmPrototype;

var _rxDocument = require("./rx-document");

var _hooks = require("./hooks");

/**
 * For the ORM capabilities,
 * we have to merge the document prototype
 * with the ORM functions and the data
 * We do this itterating over the properties and
 * adding them to a new object.
 * In the future we should do this by chaining the __proto__ objects
 */
// caches
var protoForCollection = new WeakMap();
var constructorForCollection = new WeakMap();

function getDocumentPrototype(rxCollection) {
  if (!protoForCollection.has(rxCollection)) {
    var schemaProto = rxCollection.schema.getDocumentPrototype();
    var ormProto = getDocumentOrmPrototype(rxCollection);
    var baseProto = _rxDocument.basePrototype;
    var proto = {};
    [schemaProto, ormProto, baseProto].forEach(function (obj) {
      var props = Object.getOwnPropertyNames(obj);
      props.forEach(function (key) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);
        /**
         * When enumerable is true, it will show on console.dir(instance)
         * To not polute the output, only getters and methods are enumerable
         */

        var enumerable = true;
        if (key.startsWith('_') || key.endsWith('_') || key.startsWith('$') || key.endsWith('$')) enumerable = false;

        if (typeof desc.value === 'function') {
          // when getting a function, we automatically do a .bind(this)
          Object.defineProperty(proto, key, {
            get: function get() {
              return desc.value.bind(this);
            },
            enumerable: enumerable,
            configurable: false
          });
        } else {
          desc.enumerable = enumerable;
          desc.configurable = false;
          if (desc.writable) desc.writable = false;
          Object.defineProperty(proto, key, desc);
        }
      });
    });
    protoForCollection.set(rxCollection, proto);
  }

  return protoForCollection.get(rxCollection);
}

function getRxDocumentConstructor(rxCollection) {
  if (!constructorForCollection.has(rxCollection)) {
    var ret = (0, _rxDocument.createRxDocumentConstructor)(getDocumentPrototype(rxCollection));
    constructorForCollection.set(rxCollection, ret);
  }

  return constructorForCollection.get(rxCollection);
}
/**
 * create a RxDocument-instance from the jsonData
 * and the prototype merge
 */


function createRxDocument(rxCollection, docData) {
  // return from cache if exsists
  var id = docData[rxCollection.schema.primaryPath];

  var cacheDoc = rxCollection._docCache.get(id);

  if (cacheDoc) return cacheDoc;
  var doc = (0, _rxDocument.createWithConstructor)(getRxDocumentConstructor(rxCollection), rxCollection, docData);

  rxCollection._docCache.set(id, doc);

  rxCollection._runHooksSync('post', 'create', docData, doc);

  (0, _hooks.runPluginHooks)('postCreateRxDocument', doc);
  return doc;
}
/**
 * create RxDocument from the docs-array
 */


function createRxDocuments(rxCollection, docsJSON) {
  return docsJSON.map(function (json) {
    return createRxDocument(rxCollection, json);
  });
}
/**
 * returns the prototype-object
 * that contains the orm-methods,
 * used in the proto-merge
 */


function getDocumentOrmPrototype(rxCollection) {
  var proto = {};
  Object.entries(rxCollection.methods).forEach(function (_ref) {
    var k = _ref[0],
        v = _ref[1];
    proto[k] = v;
  });
  return proto;
}

//# sourceMappingURL=rx-document-prototype-merge.js.map