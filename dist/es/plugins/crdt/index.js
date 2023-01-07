import { newRxError } from '../../rx-error';
import { clone, deepEqual, ensureNotFalsy, getProperty, now, objectPathMonad, setProperty, toArray } from '../../plugins/utils';
import modifyjs from 'modifyjs';
import { overwritable } from '../..';
export async function updateCRDT(entry) {
  entry = overwritable.deepFreezeWhenDevMode(entry);
  var jsonSchema = this.collection.schema.jsonSchema;
  if (!jsonSchema.crdt) {
    throw newRxError('CRDT1', {
      schema: jsonSchema,
      queryObj: entry
    });
  }
  var crdtOptions = ensureNotFalsy(jsonSchema.crdt);
  var storageToken = await this.collection.database.storageToken;
  return this.incrementalModify(docData => {
    var crdtDocField = clone(getProperty(docData, crdtOptions.field));
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
    crdtDocField.hash = hashCRDTOperations(this.collection.database.hashFunction, crdtDocField);
    docData = runOperationOnDocument(this.collection.database.storage.statics, this.collection.schema.jsonSchema, docData, operation);
    setProperty(docData, crdtOptions.field, crdtDocField);
    return docData;
  }, RX_CRDT_CONTEXT);
}
export async function insertCRDT(entry) {
  entry = overwritable.deepFreezeWhenDevMode(entry);
  var jsonSchema = this.schema.jsonSchema;
  if (!jsonSchema.crdt) {
    throw newRxError('CRDT1', {
      schema: jsonSchema,
      queryObj: entry
    });
  }
  var crdtOptions = ensureNotFalsy(jsonSchema.crdt);
  var storageToken = await this.database.storageToken;
  var operation = {
    body: Array.isArray(entry) ? entry : [entry],
    creator: storageToken,
    time: now()
  };
  var insertData = {};
  insertData = runOperationOnDocument(this.database.storage.statics, this.schema.jsonSchema, insertData, operation);
  var crdtDocField = {
    operations: [],
    hash: ''
  };
  setProperty(insertData, crdtOptions.field, crdtDocField);
  var lastAr = [operation];
  crdtDocField.operations.push(lastAr);
  crdtDocField.hash = hashCRDTOperations(this.database.hashFunction, crdtDocField);
  var result = await this.insert(insertData).catch(async err => {
    if (err.code === 'CONFLICT') {
      // was a conflict, update document instead of inserting
      var doc = await this.findOne(err.parameters.id).exec(true);
      return doc.updateCRDT(entry);
    } else {
      throw err;
    }
  });
  return result;
}
export function sortOperationComparator(a, b) {
  return a.creator > b.creator ? 1 : -1;
}
function runOperationOnDocument(storageStatics, schema, docData, operation) {
  var entryParts = operation.body;
  entryParts.forEach(entryPart => {
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
  var hashObj = crdts.operations.map(operations => {
    return operations.map(op => op.creator);
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
    [crdtsA, crdtsB] = [crdtsB, crdtsA];
  }
  var ret = {
    operations: [],
    hash: ''
  };
  crdtsA.operations.forEach((row, index) => {
    var mergedOps = [];
    var ids = new Set(); // used to deduplicate

    row.forEach(op => {
      ids.add(op.creator);
      mergedOps.push(op);
    });
    if (crdtsB.operations[index]) {
      crdtsB.operations[index].forEach(op => {
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
  setProperty(base, ensureNotFalsy(schema.crdt).field, crdts);
  crdts.operations.forEach(operations => {
    operations.forEach(op => {
      base = runOperationOnDocument(storageStatics, schema, base, op);
    });
  });
  return base;
}
export function getCRDTConflictHandler(hashFunction, storageStatics, schema) {
  var crdtOptions = ensureNotFalsy(schema.crdt);
  var crdtField = crdtOptions.field;
  var getCRDTValue = objectPathMonad(crdtField);
  var conflictHandler = (i, _context) => {
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
    RxDocument: proto => {
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
              context
            }
          });
        }
      };
    },
    RxCollection: proto => {
      proto.insertCRDT = insertCRDT;
    }
  },
  overwritable: {},
  hooks: {
    preCreateRxCollection: {
      after: data => {
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
      after: ({
        collection
      }) => {
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
            writes.forEach(write => {
              var newDocState = clone(write.document);
              var crdts = getCrdt(newDocState);
              var rebuild = rebuildFromCRDT(collection.database.storage.statics, collection.schema.jsonSchema, newDocState, crdts);
              function docWithoutMeta(doc) {
                var ret = {};
                Object.entries(doc).forEach(([k, v]) => {
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
                    recalculatedHash
                  }
                });
              }
            });
            return bulkWriteBefore(writes, context);
          };
        }
        var bulkInsertBefore = collection.bulkInsert.bind(collection);
        collection.bulkInsert = async function (docsData) {
          var storageToken = await collection.database.storageToken;
          var useDocsData = docsData.map(docData => {
            var setMe = {};
            Object.entries(docData).forEach(([key, value]) => {
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
            setProperty(docData, crdtOptions.field, crdtOperations);
            return docData;
          });
          return bulkInsertBefore(useDocsData);
        };
      }
    }
  }
};
//# sourceMappingURL=index.js.map