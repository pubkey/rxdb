"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBcrdtPlugin = exports.RX_CRDT_CONTEXT = void 0;
exports.getCRDTConflictHandler = getCRDTConflictHandler;
exports.getCRDTSchemaPart = getCRDTSchemaPart;
exports.hashCRDTOperations = hashCRDTOperations;
exports.insertCRDT = void 0;
exports.mergeCRDTFields = mergeCRDTFields;
exports.rebuildFromCRDT = rebuildFromCRDT;
exports.sortOperationComparator = sortOperationComparator;
exports.updateCRDT = void 0;
var _rxError = require("../../rx-error");
var _fastDeepEqual = _interopRequireDefault(require("fast-deep-equal"));
var _objectPath = _interopRequireDefault(require("object-path"));
var _util = require("../../util");
var _modifyjs = _interopRequireDefault(require("modifyjs"));
var _ = require("../..");
var insertCRDT = function insertCRDT(entry) {
  try {
    var _this4 = this;
    entry = _.overwritable.deepFreezeWhenDevMode(entry);
    var jsonSchema = _this4.schema.jsonSchema;
    if (!jsonSchema.crdt) {
      throw (0, _rxError.newRxError)('CRDT1', {
        schema: jsonSchema,
        queryObj: entry
      });
    }
    var crdtOptions = (0, _util.ensureNotFalsy)(jsonSchema.crdt);
    return Promise.resolve(_this4.database.storageToken).then(function (storageToken) {
      var operation = {
        body: Array.isArray(entry) ? entry : [entry],
        creator: storageToken,
        time: (0, _util.now)()
      };
      var insertData = {};
      insertData = runOperationOnDocument(_this4.database.storage.statics, _this4.schema.jsonSchema, insertData, operation);
      var crdtDocField = {
        operations: [],
        hash: ''
      };
      _objectPath["default"].set(insertData, crdtOptions.field, crdtDocField);
      var lastAr = [operation];
      crdtDocField.operations.push(lastAr);
      crdtDocField.hash = hashCRDTOperations(_this4.database.hashFunction, crdtDocField);
      return Promise.resolve(_this4.insert(insertData)["catch"](function (err) {
        try {
          if (err.code === 'COL19') {
            // was a conflict, update document instead of inserting
            return Promise.resolve(_this4.findOne(err.parameters.id).exec(true)).then(function (doc) {
              return doc.updateCRDT(entry);
            });
          } else {
            throw err;
          }
        } catch (e) {
          return Promise.reject(e);
        }
      }));
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
exports.insertCRDT = insertCRDT;
var updateCRDT = function updateCRDT(entry) {
  try {
    var _this2 = this;
    entry = _.overwritable.deepFreezeWhenDevMode(entry);
    var jsonSchema = _this2.collection.schema.jsonSchema;
    if (!jsonSchema.crdt) {
      throw (0, _rxError.newRxError)('CRDT1', {
        schema: jsonSchema,
        queryObj: entry
      });
    }
    var crdtOptions = (0, _util.ensureNotFalsy)(jsonSchema.crdt);
    return Promise.resolve(_this2.collection.database.storageToken).then(function (storageToken) {
      return _this2.atomicUpdate(function (docData, rxDoc) {
        var crdtDocField = (0, _util.clone)(_objectPath["default"].get(docData, crdtOptions.field));
        var operation = {
          body: Array.isArray(entry) ? entry : [entry],
          creator: storageToken,
          time: (0, _util.now)()
        };

        /**
         * A new write will ALWAYS be an operation in the last
         * array which was non existing before.
         */
        var lastAr = [operation];
        crdtDocField.operations.push(lastAr);
        crdtDocField.hash = hashCRDTOperations(_this2.collection.database.hashFunction, crdtDocField);
        var newDocData = (0, _util.clone)(rxDoc.toJSON());
        newDocData._deleted = rxDoc._data._deleted;
        newDocData = runOperationOnDocument(_this2.collection.database.storage.statics, _this2.collection.schema.jsonSchema, newDocData, operation);
        _objectPath["default"].set(newDocData, crdtOptions.field, crdtDocField);

        // add other internal fields
        var fullDocData = Object.assign({
          _attachments: rxDoc._data._attachments,
          _meta: rxDoc._data._meta,
          _rev: rxDoc._data._rev
        }, newDocData);
        return fullDocData;
      }, RX_CRDT_CONTEXT);
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
exports.updateCRDT = updateCRDT;
function sortOperationComparator(a, b) {
  return a.creator > b.creator ? 1 : -1;
}
function runOperationOnDocument(storageStatics, schema, docData, operation) {
  var entryParts = operation.body;
  entryParts.forEach(function (entryPart) {
    var isMatching;
    if (entryPart.selector) {
      var preparedQuery = storageStatics.prepareQuery(schema, {
        selector: (0, _util.ensureNotFalsy)(entryPart.selector),
        sort: [],
        skip: 0
      });
      var matcher = storageStatics.getQueryMatcher(schema, preparedQuery);
      isMatching = matcher(docData);
    } else {
      isMatching = true;
    }
    if (isMatching) {
      if (entryPart.ifMatch) {
        docData = (0, _modifyjs["default"])(docData, entryPart.ifMatch);
      }
    } else {
      if (entryPart.ifNotMatch) {
        docData = (0, _modifyjs["default"])(docData, entryPart.ifNotMatch);
      }
    }
  });
  return docData;
}
function hashCRDTOperations(hashFunction, crdts) {
  var hashObj = crdts.operations.map(function (operations) {
    return operations.map(function (op) {
      return op.creator;
    });
  });
  var hash = hashFunction(JSON.stringify(hashObj));
  return hash;
}
function getCRDTSchemaPart() {
  var operationSchema = {
    type: 'object',
    properties: {
      body: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            selector: {
              type: 'object'
            },
            ifMatch: {
              type: 'object'
            },
            ifNotMatch: {
              type: 'object'
            }
          },
          additionalProperties: false
        },
        minItems: 1
      },
      creator: {
        type: 'string'
      },
      time: {
        type: 'number',
        minimum: 1,
        maximum: 1000000000000000,
        multipleOf: 0.01
      }
    },
    additionalProperties: false,
    required: ['body', 'creator', 'time']
  };
  return {
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'array',
          items: operationSchema
        }
      },
      hash: {
        type: 'string',
        // set a minLength to not accidentally store an empty string
        minLength: 2
      }
    },
    additionalProperties: false,
    required: ['operations', 'hash']
  };
}
function mergeCRDTFields(hashFunction, crdtsA, crdtsB) {
  // the value with most operations must be A to
  // ensure we not miss out rows when iterating over both fields.
  if (crdtsA.operations.length < crdtsB.operations.length) {
    var _ref = [crdtsB, crdtsA];
    crdtsA = _ref[0];
    crdtsB = _ref[1];
  }
  var ret = {
    operations: [],
    hash: ''
  };
  crdtsA.operations.forEach(function (row, index) {
    var mergedOps = [];
    var ids = new Set(); // used to deduplicate

    row.forEach(function (op) {
      ids.add(op.creator);
      mergedOps.push(op);
    });
    crdtsB.operations[index] && crdtsB.operations[index].forEach(function (op) {
      if (!ids.has(op.creator)) {
        mergedOps.push(op);
      }
    });
    mergedOps = mergedOps.sort(sortOperationComparator);
    ret.operations[index] = mergedOps;
  });
  ret.hash = hashCRDTOperations(hashFunction, ret);
  return ret;
}
function rebuildFromCRDT(storageStatics, schema, docData, crdts) {
  var base = {
    _deleted: false
  };
  _objectPath["default"].set(base, (0, _util.ensureNotFalsy)(schema.crdt).field, crdts);
  crdts.operations.forEach(function (operations) {
    operations.forEach(function (op) {
      base = runOperationOnDocument(storageStatics, schema, base, op);
    });
  });
  return base;
}
function getCRDTConflictHandler(hashFunction, storageStatics, schema) {
  var crdtOptions = (0, _util.ensureNotFalsy)(schema.crdt);
  var crdtField = crdtOptions.field;
  var getCRDTValue = (0, _util.objectPathMonad)(crdtField);
  var conflictHandler = function conflictHandler(i, _context) {
    var newDocCrdt = getCRDTValue(i.newDocumentState);
    var masterDocCrdt = getCRDTValue(i.realMasterState);
    if (newDocCrdt.hash === masterDocCrdt.hash) {
      return Promise.resolve({
        isEqual: true
      });
    }
    var mergedCrdt = mergeCRDTFields(hashFunction, newDocCrdt, masterDocCrdt);
    var mergedDoc = rebuildFromCRDT(storageStatics, schema, i.newDocumentState, mergedCrdt);
    return Promise.resolve({
      isEqual: false,
      documentData: mergedDoc
    });
  };
  return conflictHandler;
}
var RX_CRDT_CONTEXT = 'rx-crdt';
exports.RX_CRDT_CONTEXT = RX_CRDT_CONTEXT;
var RxDBcrdtPlugin = {
  name: 'crdt',
  rxdb: true,
  prototypes: {
    RxDocument: function RxDocument(proto) {
      proto.updateCRDT = updateCRDT;
      var oldRemove = proto.remove;
      proto.remove = function () {
        if (!this.collection.schema.jsonSchema.crdt) {
          return oldRemove.bind(this)();
        }
        return this.updateCRDT({
          ifMatch: {
            $set: {
              _deleted: true
            }
          }
        });
      };
      var oldAtomicPatch = proto.atomicPatch;
      proto.atomicPatch = function (patch) {
        if (!this.collection.schema.jsonSchema.crdt) {
          return oldAtomicPatch.bind(this)(patch);
        }
        return this.updateCRDT({
          ifMatch: {
            $set: patch
          }
        });
      };
      var oldAtomicUpdate = proto.atomicUpdate;
      proto.atomicUpdate = function (fn, context) {
        if (!this.collection.schema.jsonSchema.crdt) {
          return oldAtomicUpdate.bind(this)(fn);
        }
        if (context === RX_CRDT_CONTEXT) {
          return oldAtomicUpdate.bind(this)(fn);
        } else {
          throw (0, _rxError.newRxError)('CRDT2', {
            id: this.primary,
            args: {
              context: context
            }
          });
        }
      };
    },
    RxCollection: function RxCollection(proto) {
      proto.insertCRDT = insertCRDT;
    }
  },
  overwritable: {},
  hooks: {
    preCreateRxCollection: {
      after: function after(data) {
        if (!data.schema.crdt) {
          return;
        }
        if (data.conflictHandler) {
          throw (0, _rxError.newRxError)('CRDT3', {
            collection: data.name,
            schema: data.schema
          });
        }
        data.conflictHandler = getCRDTConflictHandler(data.database.hashFunction, data.database.storage.statics, data.schema);
      }
    },
    createRxCollection: {
      after: function after(_ref2) {
        var collection = _ref2.collection;
        if (!collection.schema.jsonSchema.crdt) {
          return;
        }
        var crdtOptions = (0, _util.ensureNotFalsy)(collection.schema.jsonSchema.crdt);
        var crdtField = crdtOptions.field;
        var getCrdt = (0, _util.objectPathMonad)(crdtOptions.field);

        /**
         * In dev-mode we have to ensure that all document writes
         * have the correct crdt state so that nothing is missed out
         * or could accidentally do non-crdt writes to the document.
         */
        if (_.overwritable.isDevMode()) {
          var bulkWriteBefore = collection.storageInstance.bulkWrite.bind(collection.storageInstance);
          collection.storageInstance.bulkWrite = function (writes, context) {
            writes.forEach(function (write) {
              var newDocState = (0, _util.clone)(write.document);
              var crdts = getCrdt(newDocState);
              var rebuild = rebuildFromCRDT(collection.database.storage.statics, collection.schema.jsonSchema, newDocState, crdts);
              function docWithoutMeta(doc) {
                var ret = {};
                Object.entries(doc).forEach(function (_ref3) {
                  var k = _ref3[0],
                    v = _ref3[1];
                  if (!k.startsWith('_')) {
                    ret[k] = v;
                  }
                });
                return ret;
              }
              if (!(0, _fastDeepEqual["default"])(docWithoutMeta(newDocState), docWithoutMeta(rebuild))) {
                throw (0, _rxError.newRxError)('SNH', {
                  document: newDocState
                });
              }
              var recalculatedHash = hashCRDTOperations(collection.database.hashFunction, crdts);
              if (crdts.hash !== recalculatedHash) {
                throw (0, _rxError.newRxError)('SNH', {
                  document: newDocState,
                  args: {
                    hash: crdts.hash,
                    recalculatedHash: recalculatedHash
                  }
                });
              }
            });
            return bulkWriteBefore(writes, context);
          };
        }
        var bulkInsertBefore = collection.bulkInsert.bind(collection);
        collection.bulkInsert = function (docsData) {
          try {
            return Promise.resolve(collection.database.storageToken).then(function (storageToken) {
              var useDocsData = docsData.map(function (docData) {
                var setMe = {};
                Object.entries(docData).forEach(function (_ref4) {
                  var key = _ref4[0],
                    value = _ref4[1];
                  if (!key.startsWith('_') && key !== crdtField) {
                    setMe[key] = value;
                  }
                });
                var crdtOperations = {
                  operations: [[{
                    creator: storageToken,
                    body: [{
                      ifMatch: {
                        $set: setMe
                      }
                    }],
                    time: (0, _util.now)()
                  }]],
                  hash: ''
                };
                crdtOperations.hash = hashCRDTOperations(collection.database.hashFunction, crdtOperations);
                _objectPath["default"].set(docData, crdtOptions.field, crdtOperations);
                return docData;
              });
              return bulkInsertBefore(useDocsData);
            });
          } catch (e) {
            return Promise.reject(e);
          }
        };
      }
    }
  }
};
exports.RxDBcrdtPlugin = RxDBcrdtPlugin;
//# sourceMappingURL=index.js.map