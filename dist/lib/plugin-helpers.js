"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrapRxStorageInstance = wrapRxStorageInstance;
exports.wrappedValidateStorageFactory = wrappedValidateStorageFactory;
var _operators = require("rxjs/operators");
var _util = require("./util");
/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
var VALIDATOR_CACHE_BY_VALIDATOR_KEY = new Map();

/**
 * This factory is used in the validation plugins
 * so that we can reuse the basic storage wrapping code.
 */
function wrappedValidateStorageFactory(
/**
 * Returns a method that can be used to validate
 * documents and throws when the document is not valid.
 */
getValidator,
/**
 * A string to identify the validation library.
 */
validatorKey) {
  if (!VALIDATOR_CACHE_BY_VALIDATOR_KEY.has(validatorKey)) {
    VALIDATOR_CACHE_BY_VALIDATOR_KEY.set(validatorKey, new Map());
  }
  var VALIDATOR_CACHE = (0, _util.getFromMapOrThrow)(VALIDATOR_CACHE_BY_VALIDATOR_KEY, validatorKey);
  function initValidator(schema) {
    var hash = (0, _util.fastUnsecureHash)(JSON.stringify(schema));
    if (!VALIDATOR_CACHE.has(hash)) {
      var validator = getValidator(schema);
      VALIDATOR_CACHE.set(hash, validator);
      return validator;
    }
    return (0, _util.getFromMapOrThrow)(VALIDATOR_CACHE, hash);
  }
  return function (args) {
    return Object.assign({}, args.storage, {
      createStorageInstance: function createStorageInstance(params) {
        try {
          return Promise.resolve(args.storage.createStorageInstance(params)).then(function (instance) {
            /**
             * Lazy initialize the validator
             * to save initial page load performance.
             * Some libraries take really long to initialize the validator
             * from the schema.
             */
            var validatorCached;
            (0, _util.requestIdleCallbackIfAvailable)(function () {
              return validatorCached = initValidator(params.schema);
            });
            var oldBulkWrite = instance.bulkWrite.bind(instance);
            instance.bulkWrite = function (documentWrites, context) {
              if (!validatorCached) {
                validatorCached = initValidator(params.schema);
              }
              documentWrites.forEach(function (row) {
                validatorCached(row.document);
              });
              return oldBulkWrite(documentWrites, context);
            };
            return instance;
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }
    });
  };
}

/**
 * Used in plugins to easily modify all in- and outgoing
 * data of that storage instance.
 */
function wrapRxStorageInstance(instance, modifyToStorage, modifyFromStorage) {
  var errorFromStorage = function errorFromStorage(error) {
    try {
      var _temp5 = function _temp5() {
        function _temp2() {
          return Promise.resolve(fromStorage(ret.writeRow.document)).then(function (_fromStorage4) {
            ret.writeRow.document = _fromStorage4;
            return ret;
          });
        }
        var _temp = function () {
          if (ret.writeRow.previous) {
            return Promise.resolve(fromStorage(ret.writeRow.previous)).then(function (_fromStorage3) {
              ret.writeRow.previous = _fromStorage3;
            });
          }
        }();
        return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
      };
      var ret = (0, _util.flatClone)(error);
      ret.writeRow = (0, _util.flatClone)(ret.writeRow);
      var _temp6 = function () {
        if (ret.documentInDb) {
          return Promise.resolve(fromStorage(ret.documentInDb)).then(function (_fromStorage2) {
            ret.documentInDb = _fromStorage2;
          });
        }
      }();
      return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(_temp5) : _temp5(_temp6));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  var fromStorage = function fromStorage(docData) {
    try {
      if (!docData) {
        return Promise.resolve(docData);
      }
      return Promise.resolve(modifyFromStorage(docData));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  var toStorage = function toStorage(docData) {
    try {
      if (!docData) {
        return Promise.resolve(docData);
      }
      return Promise.resolve(modifyToStorage(docData));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  var modifyAttachmentFromStorage = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (v) {
    return v;
  };
  var oldBulkWrite = instance.bulkWrite.bind(instance);
  instance.bulkWrite = function (documentWrites, context) {
    try {
      var useRows = [];
      return Promise.resolve(Promise.all(documentWrites.map(function (row) {
        try {
          return Promise.resolve(Promise.all([row.previous ? toStorage(row.previous) : undefined, toStorage(row.document)])).then(function (_ref) {
            var previous = _ref[0],
              document = _ref[1];
            useRows.push({
              previous: previous,
              document: document
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }))).then(function () {
        return Promise.resolve(oldBulkWrite(useRows, context)).then(function (writeResult) {
          var ret = {
            success: {},
            error: {}
          };
          var promises = [];
          Object.entries(writeResult.success).forEach(function (_ref2) {
            var k = _ref2[0],
              v = _ref2[1];
            promises.push(fromStorage(v).then(function (v2) {
              return ret.success[k] = v2;
            }));
          });
          Object.entries(writeResult.error).forEach(function (_ref3) {
            var k = _ref3[0],
              error = _ref3[1];
            promises.push(errorFromStorage(error).then(function (err) {
              return ret.error[k] = err;
            }));
          });
          return Promise.resolve(Promise.all(promises)).then(function () {
            return ret;
          });
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  var oldQuery = instance.query.bind(instance);
  instance.query = function (preparedQuery) {
    return oldQuery(preparedQuery).then(function (queryResult) {
      return Promise.all(queryResult.documents.map(function (doc) {
        return fromStorage(doc);
      }));
    }).then(function (documents) {
      return {
        documents: documents
      };
    });
  };
  var oldGetAttachmentData = instance.getAttachmentData.bind(instance);
  instance.getAttachmentData = function (documentId, attachmentId) {
    try {
      return Promise.resolve(oldGetAttachmentData(documentId, attachmentId)).then(function (data) {
        return Promise.resolve(modifyAttachmentFromStorage(data)).then(function (_modifyAttachmentFrom) {
          data = _modifyAttachmentFrom;
          return data;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  var oldFindDocumentsById = instance.findDocumentsById.bind(instance);
  instance.findDocumentsById = function (ids, deleted) {
    return oldFindDocumentsById(ids, deleted).then(function (findResult) {
      try {
        var ret = {};
        return Promise.resolve(Promise.all(Object.entries(findResult).map(function (_ref4) {
          var key = _ref4[0],
            doc = _ref4[1];
          return Promise.resolve(fromStorage(doc)).then(function (_fromStorage) {
            ret[key] = _fromStorage;
          });
        }))).then(function () {
          return ret;
        });
      } catch (e) {
        return Promise.reject(e);
      }
    });
  };
  var oldGetChangedDocumentsSince = instance.getChangedDocumentsSince.bind(instance);
  instance.getChangedDocumentsSince = function (limit, checkpoint) {
    return oldGetChangedDocumentsSince(limit, checkpoint).then(function (result) {
      try {
        var _result$checkpoint2 = result.checkpoint;
        return Promise.resolve(Promise.all(result.documents.map(function (d) {
          return fromStorage(d);
        }))).then(function (_Promise$all) {
          return {
            checkpoint: _result$checkpoint2,
            documents: _Promise$all
          };
        });
      } catch (e) {
        return Promise.reject(e);
      }
    });
  };
  var oldChangeStream = instance.changeStream.bind(instance);
  instance.changeStream = function () {
    return oldChangeStream().pipe((0, _operators.mergeMap)(function (eventBulk) {
      try {
        return Promise.resolve(Promise.all(eventBulk.events.map(function (event) {
          try {
            return Promise.resolve(Promise.all([fromStorage(event.documentData), fromStorage(event.previousDocumentData)])).then(function (_ref5) {
              var documentData = _ref5[0],
                previousDocumentData = _ref5[1];
              var ev = {
                operation: event.operation,
                eventId: event.eventId,
                documentId: event.documentId,
                endTime: event.endTime,
                startTime: event.startTime,
                documentData: documentData,
                previousDocumentData: previousDocumentData,
                isLocal: false
              };
              return ev;
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function (useEvents) {
          var ret = {
            id: eventBulk.id,
            events: useEvents,
            checkpoint: eventBulk.checkpoint,
            context: eventBulk.context
          };
          return ret;
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }));
  };
  var oldConflictResultionTasks = instance.conflictResultionTasks.bind(instance);
  instance.conflictResultionTasks = function () {
    return oldConflictResultionTasks().pipe((0, _operators.mergeMap)(function (task) {
      try {
        return Promise.resolve(fromStorage(task.input.assumedMasterState)).then(function (assumedMasterState) {
          return Promise.resolve(fromStorage(task.input.newDocumentState)).then(function (newDocumentState) {
            return Promise.resolve(fromStorage(task.input.realMasterState)).then(function (realMasterState) {
              return {
                id: task.id,
                context: task.context,
                input: {
                  assumedMasterState: assumedMasterState,
                  realMasterState: realMasterState,
                  newDocumentState: newDocumentState
                }
              };
            });
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }));
  };
  var oldResolveConflictResultionTask = instance.resolveConflictResultionTask.bind(instance);
  instance.resolveConflictResultionTask = function (taskSolution) {
    if (taskSolution.output.isEqual) {
      return oldResolveConflictResultionTask(taskSolution);
    }
    var useSolution = {
      id: taskSolution.id,
      output: {
        isEqual: false,
        documentData: taskSolution.output.documentData
      }
    };
    return oldResolveConflictResultionTask(useSolution);
  };
  return instance;
}
//# sourceMappingURL=plugin-helpers.js.map