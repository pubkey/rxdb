import { filter, mergeMap, tap } from 'rxjs/operators';
import { getPrimaryFieldOfPrimaryKey } from './rx-schema-helper';
import { defaultHashSha256, flatClone, getFromMapOrThrow, requestIdleCallbackIfAvailable } from './plugins/utils';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
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
    var hash = defaultHashSha256(JSON.stringify(schema));
    if (!VALIDATOR_CACHE.has(hash)) {
      var validator = getValidator(schema);
      VALIDATOR_CACHE.set(hash, validator);
      return validator;
    }
    return getFromMapOrThrow(VALIDATOR_CACHE, hash);
  }
  return args => {
    return Object.assign({}, args.storage, {
      async createStorageInstance(params) {
        var instance = await args.storage.createStorageInstance(params);
        var primaryPath = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);

        /**
         * Lazy initialize the validator
         * to save initial page load performance.
         * Some libraries take really long to initialize the validator
         * from the schema.
         */
        var validatorCached;
        requestIdleCallbackIfAvailable(() => validatorCached = initValidator(params.schema));
        var oldBulkWrite = instance.bulkWrite.bind(instance);
        instance.bulkWrite = (documentWrites, context) => {
          if (!validatorCached) {
            validatorCached = initValidator(params.schema);
          }
          var errors = [];
          var continueWrites = [];
          documentWrites.forEach(row => {
            var documentId = row.document[primaryPath];
            var validationErrors = validatorCached(row.document);
            if (validationErrors.length > 0) {
              errors.push({
                status: 422,
                isError: true,
                documentId,
                writeRow: row,
                validationErrors
              });
            } else {
              continueWrites.push(row);
            }
          });
          var writePromise = continueWrites.length > 0 ? oldBulkWrite(continueWrites, context) : Promise.resolve({
            error: {},
            success: {}
          });
          return writePromise.then(writeResult => {
            errors.forEach(validationError => {
              writeResult.error[validationError.documentId] = validationError;
            });
            return writeResult;
          });
        };
        return instance;
      }
    });
  };
}

/**
 * Used in plugins to easily modify all in- and outgoing
 * data of that storage instance.
 */
export function wrapRxStorageInstance(instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage = v => v) {
  async function toStorage(docData) {
    if (!docData) {
      return docData;
    }
    return await modifyToStorage(docData);
  }
  async function fromStorage(docData) {
    if (!docData) {
      return docData;
    }
    return await modifyFromStorage(docData);
  }
  async function errorFromStorage(error) {
    var ret = flatClone(error);
    ret.writeRow = flatClone(ret.writeRow);
    if (ret.documentInDb) {
      ret.documentInDb = await fromStorage(ret.documentInDb);
    }
    if (ret.writeRow.previous) {
      ret.writeRow.previous = await fromStorage(ret.writeRow.previous);
    }
    ret.writeRow.document = await fromStorage(ret.writeRow.document);
    return ret;
  }
  var processingChangesCount$ = new BehaviorSubject(0);
  var wrappedInstance = {
    databaseName: instance.databaseName,
    internals: instance.internals,
    cleanup: instance.cleanup.bind(instance),
    options: instance.options,
    close: instance.close.bind(instance),
    schema: instance.schema,
    collectionName: instance.collectionName,
    count: instance.count.bind(instance),
    remove: instance.remove.bind(instance),
    originalStorageInstance: instance,
    bulkWrite: async (documentWrites, context) => {
      var useRows = [];
      await Promise.all(documentWrites.map(async row => {
        var [previous, document] = await Promise.all([row.previous ? toStorage(row.previous) : undefined, toStorage(row.document)]);
        useRows.push({
          previous,
          document
        });
      }));
      var writeResult = await instance.bulkWrite(useRows, context);
      var ret = {
        success: {},
        error: {}
      };
      var promises = [];
      Object.entries(writeResult.success).forEach(([k, v]) => {
        promises.push(fromStorage(v).then(v2 => ret.success[k] = v2));
      });
      Object.entries(writeResult.error).forEach(([k, error]) => {
        promises.push(errorFromStorage(error).then(err => ret.error[k] = err));
      });
      await Promise.all(promises);

      /**
       * By definition, all change events must be emitted
       * BEFORE the write call resolves.
       * To ensure that even when the modifiers are async,
       * we wait here until the processing queue is empty.
       */
      await firstValueFrom(processingChangesCount$.pipe(filter(v => v === 0)));
      return ret;
    },
    query: preparedQuery => {
      return instance.query(preparedQuery).then(queryResult => {
        return Promise.all(queryResult.documents.map(doc => fromStorage(doc)));
      }).then(documents => ({
        documents: documents
      }));
    },
    getAttachmentData: async (documentId, attachmentId) => {
      var data = await instance.getAttachmentData(documentId, attachmentId);
      data = await modifyAttachmentFromStorage(data);
      return data;
    },
    findDocumentsById: (ids, deleted) => {
      return instance.findDocumentsById(ids, deleted).then(async findResult => {
        var ret = {};
        await Promise.all(Object.entries(findResult).map(async ([key, doc]) => {
          ret[key] = await fromStorage(doc);
        }));
        return ret;
      });
    },
    getChangedDocumentsSince: (limit, checkpoint) => {
      return instance.getChangedDocumentsSince(limit, checkpoint).then(async result => {
        return {
          checkpoint: result.checkpoint,
          documents: await Promise.all(result.documents.map(d => fromStorage(d)))
        };
      });
    },
    changeStream: () => {
      return instance.changeStream().pipe(tap(() => processingChangesCount$.next(processingChangesCount$.getValue() + 1)), mergeMap(async eventBulk => {
        var useEvents = await Promise.all(eventBulk.events.map(async event => {
          var [documentData, previousDocumentData] = await Promise.all([fromStorage(event.documentData), fromStorage(event.previousDocumentData)]);
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
        }));
        var ret = {
          id: eventBulk.id,
          events: useEvents,
          checkpoint: eventBulk.checkpoint,
          context: eventBulk.context
        };
        return ret;
      }), tap(() => processingChangesCount$.next(processingChangesCount$.getValue() - 1)));
    },
    conflictResultionTasks: () => {
      return instance.conflictResultionTasks().pipe(mergeMap(async task => {
        var assumedMasterState = await fromStorage(task.input.assumedMasterState);
        var newDocumentState = await fromStorage(task.input.newDocumentState);
        var realMasterState = await fromStorage(task.input.realMasterState);
        return {
          id: task.id,
          context: task.context,
          input: {
            assumedMasterState,
            realMasterState,
            newDocumentState
          }
        };
      }));
    },
    resolveConflictResultionTask: taskSolution => {
      if (taskSolution.output.isEqual) {
        return instance.resolveConflictResultionTask(taskSolution);
      }
      var useSolution = {
        id: taskSolution.id,
        output: {
          isEqual: false,
          documentData: taskSolution.output.documentData
        }
      };
      return instance.resolveConflictResultionTask(useSolution);
    }
  };
  return wrappedInstance;
}
//# sourceMappingURL=plugin-helpers.js.map