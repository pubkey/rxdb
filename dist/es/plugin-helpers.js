import { mergeMap } from 'rxjs/operators';
import { fastUnsecureHash, flatClone, getFromMapOrThrow, requestIdleCallbackIfAvailable } from './util';

/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
var VALIDATOR_CACHE_BY_VALIDATOR_KEY = new Map();
/**
 * This factory is used in the validation plugins
 * so that we can reuse the basic storage wrapping code.
 */

export function wrappedValidateStorageFactory(
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

  var VALIDATOR_CACHE = getFromMapOrThrow(VALIDATOR_CACHE_BY_VALIDATOR_KEY, validatorKey);

  function initValidator(schema) {
    var hash = fastUnsecureHash(JSON.stringify(schema));

    if (!VALIDATOR_CACHE.has(hash)) {
      var validator = getValidator(schema);
      VALIDATOR_CACHE.set(hash, validator);
      return validator;
    }

    return getFromMapOrThrow(VALIDATOR_CACHE, hash);
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
            requestIdleCallbackIfAvailable(function () {
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

export function wrapRxStorageInstance(instance, modifyToStorage, modifyFromStorage) {
  var errorFromStorage = function errorFromStorage(error) {
    try {
      var _temp6 = function _temp6() {
        function _temp3() {
          return Promise.resolve(fromStorage(ret.writeRow.document)).then(function (_fromStorage7) {
            ret.writeRow.document = _fromStorage7;
            return ret;
          });
        }

        var _temp2 = function () {
          if (ret.writeRow.previous) {
            return Promise.resolve(fromStorage(ret.writeRow.previous)).then(function (_fromStorage6) {
              ret.writeRow.previous = _fromStorage6;
            });
          }
        }();

        return _temp2 && _temp2.then ? _temp2.then(_temp3) : _temp3(_temp2);
      };

      var ret = flatClone(error);
      ret.writeRow = flatClone(ret.writeRow);

      var _temp7 = function () {
        if (ret.documentInDb) {
          return Promise.resolve(fromStorage(ret.documentInDb)).then(function (_fromStorage5) {
            ret.documentInDb = _fromStorage5;
          });
        }
      }();

      return Promise.resolve(_temp7 && _temp7.then ? _temp7.then(_temp6) : _temp6(_temp7));
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
            promises.push(fromStorage(v).then(function (v) {
              return ret.success[k] = v;
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
    return oldChangeStream().pipe(mergeMap(function (eventBulk) {
      try {
        return Promise.resolve(Promise.all(eventBulk.events.map(function (event) {
          try {
            var _event$startTime2 = event.startTime,
                _event$endTime2 = event.endTime,
                _event$documentId2 = event.documentId,
                _event$eventId2 = event.eventId,
                _event$change$operati2 = event.change.operation,
                _event$change$id2 = event.change.id;
            return Promise.resolve(fromStorage(event.change.doc)).then(function (_fromStorage2) {
              var _temp = _fromStorage2;
              return Promise.resolve(fromStorage(event.change.previous)).then(function (_fromStorage3) {
                return {
                  eventId: _event$eventId2,
                  documentId: _event$documentId2,
                  endTime: _event$endTime2,
                  startTime: _event$startTime2,
                  change: {
                    id: _event$change$id2,
                    operation: _event$change$operati2,
                    doc: _temp,
                    previous: _fromStorage3
                  }
                };
              });
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
    return oldConflictResultionTasks().pipe(mergeMap(function (task) {
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
    try {
      if (taskSolution.output.isEqual) {
        return Promise.resolve(oldResolveConflictResultionTask(taskSolution));
      }

      var _taskSolution$id2 = taskSolution.id;
      return Promise.resolve(fromStorage(taskSolution.output.documentData)).then(function (_fromStorage4) {
        var useSolution = {
          id: _taskSolution$id2,
          output: {
            isEqual: false,
            documentData: _fromStorage4
          }
        };
        return oldResolveConflictResultionTask(useSolution);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return instance;
}
//# sourceMappingURL=plugin-helpers.js.map