import { filter, mergeMap, tap } from 'rxjs/operators';
import { getPrimaryFieldOfPrimaryKey } from "./rx-schema-helper.js";
import { flatClone, getFromMapOrCreate, requestIdleCallbackIfAvailable } from "./plugins/utils/index.js";
import { BehaviorSubject, firstValueFrom } from 'rxjs';

/**
 * Returns the validation errors.
 * If document is fully valid, returns an empty array.
 */

/**
 * cache the validators by the schema string
 * so we can reuse them when multiple collections have the same schema
 *
 * Notice: to make it easier and not dependent on a hash function,
 * we use the plain json string.
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
  var VALIDATOR_CACHE = getFromMapOrCreate(VALIDATOR_CACHE_BY_VALIDATOR_KEY, validatorKey, () => new Map());
  function initValidator(schema) {
    return getFromMapOrCreate(VALIDATOR_CACHE, JSON.stringify(schema), () => getValidator(schema));
  }
  return args => {
    return Object.assign({}, args.storage, {
      name: 'validate-' + validatorKey + '-' + args.storage.name,
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
                validationErrors,
                schema: instance.schema,
                writeRow: row
              });
            } else {
              continueWrites.push(row);
            }
          });
          var writePromise = continueWrites.length > 0 ? oldBulkWrite(continueWrites, context) : Promise.resolve({
            error: [],
            success: []
          });
          return writePromise.then(writeResult => {
            errors.forEach(validationError => {
              writeResult.error.push(validationError);
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
export function wrapRxStorageInstance(originalSchema, instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage = v => v) {
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
    schema: originalSchema,
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
        error: []
      };
      var promises = [];
      writeResult.error.forEach(error => {
        promises.push(errorFromStorage(error).then(err => ret.error.push(err)));
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
    getAttachmentData: async (documentId, attachmentId, digest) => {
      var data = await instance.getAttachmentData(documentId, attachmentId, digest);
      data = await modifyAttachmentFromStorage(data);
      return data;
    },
    findDocumentsById: (ids, deleted) => {
      return instance.findDocumentsById(ids, deleted).then(async findResult => {
        var ret = [];
        await Promise.all(findResult.map(async doc => {
          ret.push(await fromStorage(doc));
        }));
        return ret;
      });
    },
    getChangedDocumentsSince: !instance.getChangedDocumentsSince ? undefined : (limit, checkpoint) => {
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
            documentId: event.documentId,
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
    }
  };
  return wrappedInstance;
}
//# sourceMappingURL=plugin-helpers.js.map