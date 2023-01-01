import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { newRxError } from '../../rx-error';
import deepEqual from 'fast-deep-equal';
import objectPath from 'object-path';
import { clone, ensureNotFalsy, now, objectPathMonad, toArray } from '../../plugins/utils';
import modifyjs from 'modifyjs';
import { overwritable } from '../..';
export function updateCRDT(_x) {
  return _updateCRDT.apply(this, arguments);
}
function _updateCRDT() {
  _updateCRDT = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(entry) {
    var _this = this;
    var jsonSchema, crdtOptions, storageToken;
    return _regeneratorRuntime.wrap(function _callee2$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          entry = overwritable.deepFreezeWhenDevMode(entry);
          jsonSchema = this.collection.schema.jsonSchema;
          if (jsonSchema.crdt) {
            _context3.next = 4;
            break;
          }
          throw newRxError('CRDT1', {
            schema: jsonSchema,
            queryObj: entry
          });
        case 4:
          crdtOptions = ensureNotFalsy(jsonSchema.crdt);
          _context3.next = 7;
          return this.collection.database.storageToken;
        case 7:
          storageToken = _context3.sent;
          return _context3.abrupt("return", this.incrementalModify(function (docData) {
            var crdtDocField = clone(objectPath.get(docData, crdtOptions.field));
            var operation = {
              body: toArray(entry),
              creator: storageToken,
              time: now()
            };

            /**
             * A new write will ALWAYS be an operation in the last
             * array which was non existing before.
             */
            var lastAr = [operation];
            crdtDocField.operations.push(lastAr);
            crdtDocField.hash = hashCRDTOperations(_this.collection.database.hashFunction, crdtDocField);
            docData = runOperationOnDocument(_this.collection.database.storage.statics, _this.collection.schema.jsonSchema, docData, operation);
            objectPath.set(docData, crdtOptions.field, crdtDocField);
            return docData;
          }, RX_CRDT_CONTEXT));
        case 9:
        case "end":
          return _context3.stop();
      }
    }, _callee2, this);
  }));
  return _updateCRDT.apply(this, arguments);
}
export function insertCRDT(_x2) {
  return _insertCRDT.apply(this, arguments);
}
function _insertCRDT() {
  _insertCRDT = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(entry) {
    var _this2 = this;
    var jsonSchema, crdtOptions, storageToken, operation, insertData, crdtDocField, lastAr, result;
    return _regeneratorRuntime.wrap(function _callee4$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          entry = overwritable.deepFreezeWhenDevMode(entry);
          jsonSchema = this.schema.jsonSchema;
          if (jsonSchema.crdt) {
            _context5.next = 4;
            break;
          }
          throw newRxError('CRDT1', {
            schema: jsonSchema,
            queryObj: entry
          });
        case 4:
          crdtOptions = ensureNotFalsy(jsonSchema.crdt);
          _context5.next = 7;
          return this.database.storageToken;
        case 7:
          storageToken = _context5.sent;
          operation = {
            body: Array.isArray(entry) ? entry : [entry],
            creator: storageToken,
            time: now()
          };
          insertData = {};
          insertData = runOperationOnDocument(this.database.storage.statics, this.schema.jsonSchema, insertData, operation);
          crdtDocField = {
            operations: [],
            hash: ''
          };
          objectPath.set(insertData, crdtOptions.field, crdtDocField);
          lastAr = [operation];
          crdtDocField.operations.push(lastAr);
          crdtDocField.hash = hashCRDTOperations(this.database.hashFunction, crdtDocField);
          _context5.next = 18;
          return this.insert(insertData)["catch"]( /*#__PURE__*/function () {
            var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(err) {
              var doc;
              return _regeneratorRuntime.wrap(function _callee3$(_context4) {
                while (1) switch (_context4.prev = _context4.next) {
                  case 0:
                    if (!(err.code === 'CONFLICT')) {
                      _context4.next = 7;
                      break;
                    }
                    _context4.next = 3;
                    return _this2.findOne(err.parameters.id).exec(true);
                  case 3:
                    doc = _context4.sent;
                    return _context4.abrupt("return", doc.updateCRDT(entry));
                  case 7:
                    throw err;
                  case 8:
                  case "end":
                    return _context4.stop();
                }
              }, _callee3);
            }));
            return function (_x4) {
              return _ref6.apply(this, arguments);
            };
          }());
        case 18:
          result = _context5.sent;
          return _context5.abrupt("return", result);
        case 20:
        case "end":
          return _context5.stop();
      }
    }, _callee4, this);
  }));
  return _insertCRDT.apply(this, arguments);
}
export function sortOperationComparator(a, b) {
  return a.creator > b.creator ? 1 : -1;
}
function runOperationOnDocument(storageStatics, schema, docData, operation) {
  var entryParts = operation.body;
  entryParts.forEach(function (entryPart) {
    var isMatching;
    if (entryPart.selector) {
      var preparedQuery = storageStatics.prepareQuery(schema, {
        selector: ensureNotFalsy(entryPart.selector),
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
        docData = modifyjs(docData, entryPart.ifMatch);
      }
    } else {
      if (entryPart.ifNotMatch) {
        docData = modifyjs(docData, entryPart.ifNotMatch);
      }
    }
  });
  return docData;
}
export function hashCRDTOperations(hashFunction, crdts) {
  var hashObj = crdts.operations.map(function (operations) {
    return operations.map(function (op) {
      return op.creator;
    });
  });
  var hash = hashFunction(JSON.stringify(hashObj));
  return hash;
}
export function getCRDTSchemaPart() {
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
export function mergeCRDTFields(hashFunction, crdtsA, crdtsB) {
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
    if (crdtsB.operations[index]) {
      crdtsB.operations[index].forEach(function (op) {
        if (!ids.has(op.creator)) {
          mergedOps.push(op);
        }
      });
    }
    mergedOps = mergedOps.sort(sortOperationComparator);
    ret.operations[index] = mergedOps;
  });
  ret.hash = hashCRDTOperations(hashFunction, ret);
  return ret;
}
export function rebuildFromCRDT(storageStatics, schema, docData, crdts) {
  var base = {
    _deleted: false
  };
  objectPath.set(base, ensureNotFalsy(schema.crdt).field, crdts);
  crdts.operations.forEach(function (operations) {
    operations.forEach(function (op) {
      base = runOperationOnDocument(storageStatics, schema, base, op);
    });
  });
  return base;
}
export function getCRDTConflictHandler(hashFunction, storageStatics, schema) {
  var crdtOptions = ensureNotFalsy(schema.crdt);
  var crdtField = crdtOptions.field;
  var getCRDTValue = objectPathMonad(crdtField);
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
export var RX_CRDT_CONTEXT = 'rx-crdt';
export var RxDBcrdtPlugin = {
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
      var oldincrementalPatch = proto.incrementalPatch;
      proto.incrementalPatch = function (patch) {
        if (!this.collection.schema.jsonSchema.crdt) {
          return oldincrementalPatch.bind(this)(patch);
        }
        return this.updateCRDT({
          ifMatch: {
            $set: patch
          }
        });
      };
      var oldincrementalModify = proto.incrementalModify;
      proto.incrementalModify = function (fn, context) {
        if (!this.collection.schema.jsonSchema.crdt) {
          return oldincrementalModify.bind(this)(fn);
        }
        if (context === RX_CRDT_CONTEXT) {
          return oldincrementalModify.bind(this)(fn);
        } else {
          throw newRxError('CRDT2', {
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
          throw newRxError('CRDT3', {
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
        var crdtOptions = ensureNotFalsy(collection.schema.jsonSchema.crdt);
        var crdtField = crdtOptions.field;
        var getCrdt = objectPathMonad(crdtOptions.field);

        /**
         * In dev-mode we have to ensure that all document writes
         * have the correct crdt state so that nothing is missed out
         * or could accidentally do non-crdt writes to the document.
         */
        if (overwritable.isDevMode()) {
          var bulkWriteBefore = collection.storageInstance.bulkWrite.bind(collection.storageInstance);
          collection.storageInstance.bulkWrite = function (writes, context) {
            writes.forEach(function (write) {
              var newDocState = clone(write.document);
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
              if (!deepEqual(docWithoutMeta(newDocState), docWithoutMeta(rebuild))) {
                throw newRxError('SNH', {
                  document: newDocState
                });
              }
              var recalculatedHash = hashCRDTOperations(collection.database.hashFunction, crdts);
              if (crdts.hash !== recalculatedHash) {
                throw newRxError('SNH', {
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
        collection.bulkInsert = /*#__PURE__*/function () {
          var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(docsData) {
            var storageToken, useDocsData;
            return _regeneratorRuntime.wrap(function _callee$(_context2) {
              while (1) switch (_context2.prev = _context2.next) {
                case 0:
                  _context2.next = 2;
                  return collection.database.storageToken;
                case 2:
                  storageToken = _context2.sent;
                  useDocsData = docsData.map(function (docData) {
                    var setMe = {};
                    Object.entries(docData).forEach(function (_ref5) {
                      var key = _ref5[0],
                        value = _ref5[1];
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
                        time: now()
                      }]],
                      hash: ''
                    };
                    crdtOperations.hash = hashCRDTOperations(collection.database.hashFunction, crdtOperations);
                    objectPath.set(docData, crdtOptions.field, crdtOperations);
                    return docData;
                  });
                  return _context2.abrupt("return", bulkInsertBefore(useDocsData));
                case 5:
                case "end":
                  return _context2.stop();
              }
            }, _callee);
          }));
          return function (_x3) {
            return _ref4.apply(this, arguments);
          };
        }();
      }
    }
  }
};
//# sourceMappingURL=index.js.map