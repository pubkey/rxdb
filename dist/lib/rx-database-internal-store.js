"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.STORAGE_TOKEN_DOCUMENT_KEY = exports.STORAGE_TOKEN_DOCUMENT_ID = exports.INTERNAL_STORE_SCHEMA_TITLE = exports.INTERNAL_STORE_SCHEMA = exports.INTERNAL_CONTEXT_STORAGE_TOKEN = exports.INTERNAL_CONTEXT_COLLECTION = void 0;
exports._collectionNamePrimary = _collectionNamePrimary;
exports.getAllCollectionDocuments = exports.ensureStorageTokenDocumentExists = exports.addConnectedStorageToCollection = void 0;
exports.getPrimaryKeyOfInternalDocument = getPrimaryKeyOfInternalDocument;

var _rxError = require("./rx-error");

var _rxSchemaHelper = require("./rx-schema-helper");

var _rxStorageHelper = require("./rx-storage-helper");

var _util = require("./util");

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }

        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }

    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }

    pact.s = state;
    pact.v = value;
    var observer = pact.o;

    if (observer) {
      observer(pact);
    }
  }
}

var _Pact = /*#__PURE__*/function () {
  function _Pact() {}

  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;

    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;

      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }

        return result;
      } else {
        return this;
      }
    }

    this.o = function (_this) {
      try {
        var value = _this.v;

        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };

    return result;
  };

  return _Pact;
}();

function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}

function _for(test, update, body) {
  var stage;

  for (;;) {
    var shouldContinue = test();

    if (_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }

    if (!shouldContinue) {
      return result;
    }

    if (shouldContinue.then) {
      stage = 0;
      break;
    }

    var result = body();

    if (result && result.then) {
      if (_isSettledPact(result)) {
        result = result.s;
      } else {
        stage = 1;
        break;
      }
    }

    if (update) {
      var updateValue = update();

      if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
        stage = 2;
        break;
      }
    }
  }

  var pact = new _Pact();

  var reject = _settle.bind(null, pact, 2);

  (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
  return pact;

  function _resumeAfterBody(value) {
    result = value;

    do {
      if (update) {
        updateValue = update();

        if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
          updateValue.then(_resumeAfterUpdate).then(void 0, reject);
          return;
        }
      }

      shouldContinue = test();

      if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.v) {
        _settle(pact, 1, result);

        return;
      }

      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }

      result = body();

      if (_isSettledPact(result)) {
        result = result.v;
      }
    } while (!result || !result.then);

    result.then(_resumeAfterBody).then(void 0, reject);
  }

  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      result = body();

      if (result && result.then) {
        result.then(_resumeAfterBody).then(void 0, reject);
      } else {
        _resumeAfterBody(result);
      }
    } else {
      _settle(pact, 1, result);
    }
  }

  function _resumeAfterUpdate() {
    if (shouldContinue = test()) {
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _resumeAfterTest(shouldContinue);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
}

var addConnectedStorageToCollection = function addConnectedStorageToCollection(collection, storageCollectionName, schema) {
  try {
    var _exit2 = false;

    var collectionNameWithVersion = _collectionNamePrimary(collection.name, collection.schema.jsonSchema);

    var collectionDocId = getPrimaryKeyOfInternalDocument(collectionNameWithVersion, INTERNAL_CONTEXT_COLLECTION);
    return Promise.resolve(_for(function () {
      return !_exit2;
    }, void 0, function () {
      return Promise.resolve((0, _rxStorageHelper.getSingleDocument)(collection.database.internalStore, collectionDocId)).then(function (collectionDoc) {
        var saveData = (0, _util.clone)((0, _util.ensureNotFalsy)(collectionDoc));
        /**
         * Add array if not exist for backwards compatibility
         * TODO remove this in 2023
         */

        if (!saveData.data.connectedStorages) {
          saveData.data.connectedStorages = [];
        } // do nothing if already in array


        var alreadyThere = saveData.data.connectedStorages.find(function (row) {
          return row.collectionName === storageCollectionName && row.schema.version === schema.version;
        });

        if (alreadyThere) {
          _exit2 = true;
          return;
        } // otherwise add to array and save


        saveData.data.connectedStorages.push({
          collectionName: storageCollectionName,
          schema: schema
        });
        return _catch(function () {
          return Promise.resolve((0, _rxStorageHelper.writeSingle)(collection.database.internalStore, {
            previous: (0, _util.ensureNotFalsy)(collectionDoc),
            document: saveData
          }, 'add-connected-storage-to-collection')).then(function () {});
        }, function (err) {
          if (!(0, _rxError.isBulkWriteConflictError)(err)) {
            throw err;
          }
        });
      });
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * returns the primary for a given collection-data
 * used in the internal store of a RxDatabase
 */


exports.addConnectedStorageToCollection = addConnectedStorageToCollection;

var ensureStorageTokenDocumentExists = function ensureStorageTokenDocumentExists(rxDatabase) {
  try {
    /**
     * To have less read-write cycles,
     * we just try to insert a new document
     * and only fetch the existing one if a conflict happened.
     */
    var storageToken = (0, _util.randomCouchString)(10);
    var passwordHash = rxDatabase.password ? (0, _util.fastUnsecureHash)(rxDatabase.password) : undefined;
    var docData = {
      id: STORAGE_TOKEN_DOCUMENT_ID,
      context: INTERNAL_CONTEXT_STORAGE_TOKEN,
      key: STORAGE_TOKEN_DOCUMENT_KEY,
      data: {
        token: storageToken,

        /**
         * We add the instance token here
         * to be able to detect if a given RxDatabase instance
         * is the first instance that was ever created
         * or if databases have existed earlier on that storage
         * with the same database name.
         */
        instanceToken: rxDatabase.token,
        passwordHash: passwordHash
      },
      _deleted: false,
      _meta: (0, _util.getDefaultRxDocumentMeta)(),
      _rev: (0, _util.getDefaultRevision)(),
      _attachments: {}
    };
    return Promise.resolve(rxDatabase.internalStore.bulkWrite([{
      document: docData
    }], 'internal-add-storage-token')).then(function (writeResult) {
      if (writeResult.success[STORAGE_TOKEN_DOCUMENT_ID]) {
        return writeResult.success[STORAGE_TOKEN_DOCUMENT_ID];
      }
      /**
       * If we get a 409 error,
       * it means another instance already inserted the storage token.
       * So we get that token from the database and return that one.
       */


      var error = (0, _util.ensureNotFalsy)(writeResult.error[STORAGE_TOKEN_DOCUMENT_ID]);

      if (error.isError && error.status === 409) {
        var conflictError = error;

        if (passwordHash && passwordHash !== (0, _util.ensureNotFalsy)(conflictError.documentInDb).data.passwordHash) {
          throw (0, _rxError.newRxError)('DB1', {
            passwordHash: passwordHash,
            existingPasswordHash: (0, _util.ensureNotFalsy)(conflictError.documentInDb).data.passwordHash
          });
        }

        var storageTokenDocInDb = conflictError.documentInDb;
        return (0, _util.ensureNotFalsy)(storageTokenDocInDb);
      }

      throw error;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.ensureStorageTokenDocumentExists = ensureStorageTokenDocumentExists;

/**
 * Returns all internal documents
 * with context 'collection'
 */
var getAllCollectionDocuments = function getAllCollectionDocuments(storageStatics, storageInstance) {
  try {
    var getAllQueryPrepared = storageStatics.prepareQuery(storageInstance.schema, {
      selector: {
        context: INTERNAL_CONTEXT_COLLECTION
      },
      sort: [{
        id: 'asc'
      }],
      skip: 0
    });
    return Promise.resolve(storageInstance.query(getAllQueryPrepared)).then(function (queryResult) {
      var allDocs = queryResult.documents;
      return allDocs;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */


exports.getAllCollectionDocuments = getAllCollectionDocuments;
var INTERNAL_CONTEXT_COLLECTION = 'collection';
exports.INTERNAL_CONTEXT_COLLECTION = INTERNAL_CONTEXT_COLLECTION;
var INTERNAL_CONTEXT_STORAGE_TOKEN = 'storage-token';
/**
 * Do not change the title,
 * we have to flag the internal schema so that
 * some RxStorage implementations are able
 * to detect if the created RxStorageInstance
 * is from the internals or not,
 * to do some optimizations in some cases.
 */

exports.INTERNAL_CONTEXT_STORAGE_TOKEN = INTERNAL_CONTEXT_STORAGE_TOKEN;
var INTERNAL_STORE_SCHEMA_TITLE = 'RxInternalDocument';
exports.INTERNAL_STORE_SCHEMA_TITLE = INTERNAL_STORE_SCHEMA_TITLE;
var INTERNAL_STORE_SCHEMA = (0, _rxSchemaHelper.fillWithDefaultSettings)({
  version: 0,
  title: INTERNAL_STORE_SCHEMA_TITLE,
  primaryKey: {
    key: 'id',
    fields: ['context', 'key'],
    separator: '|'
  },
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 200
    },
    key: {
      type: 'string'
    },
    context: {
      type: 'string',
      "enum": [INTERNAL_CONTEXT_COLLECTION, INTERNAL_CONTEXT_STORAGE_TOKEN, 'OTHER']
    },
    data: {
      type: 'object',
      additionalProperties: true
    }
  },
  indexes: [],
  required: ['key', 'context', 'data'],
  additionalProperties: false,

  /**
   * If the sharding plugin is used,
   * it must not shard on the internal RxStorageInstance
   * because that one anyway has only a small amount of documents
   * and also its creation is in the hot path of the initial page load,
   * so we should spend less time creating multiple RxStorageInstances.
   */
  sharding: {
    shards: 1,
    mode: 'collection'
  }
});
exports.INTERNAL_STORE_SCHEMA = INTERNAL_STORE_SCHEMA;

function getPrimaryKeyOfInternalDocument(key, context) {
  return (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(INTERNAL_STORE_SCHEMA, {
    key: key,
    context: context
  });
}

var STORAGE_TOKEN_DOCUMENT_KEY = 'storageToken';
exports.STORAGE_TOKEN_DOCUMENT_KEY = STORAGE_TOKEN_DOCUMENT_KEY;
var STORAGE_TOKEN_DOCUMENT_ID = getPrimaryKeyOfInternalDocument(STORAGE_TOKEN_DOCUMENT_KEY, INTERNAL_CONTEXT_STORAGE_TOKEN);
exports.STORAGE_TOKEN_DOCUMENT_ID = STORAGE_TOKEN_DOCUMENT_ID;

function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}
//# sourceMappingURL=rx-database-internal-store.js.map