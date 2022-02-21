import { Subject } from 'rxjs';
import { createRevision, getHeightOfRevision, parseRevision, lastOfArray, flatClone, now, ensureNotFalsy, randomCouchString, isMaybeReadonlyArray } from '../../util';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { CHANGES_COLLECTION_SUFFIX, closeLokiCollections, getLokiDatabase, getLokiEventKey, OPEN_LOKIJS_STORAGE_INSTANCES, LOKIJS_COLLECTION_DEFAULT_OPTIONS, stripLokiKey, getLokiSortComparator, getLokiLeaderElector, removeLokiLeaderElectorReference, requestRemoteInstance, mustUseLocalState, handleRemoteRequest } from './lokijs-helper';
export var createLokiStorageInstance = function createLokiStorageInstance(storage, params, databaseSettings) {
  try {
    var _temp7 = function _temp7() {
      var instance = new RxStorageInstanceLoki(storage, params.databaseName, params.collectionName, params.schema, _internals, params.options, databaseSettings);
      /**
       * Directly create the localState if the db becomes leader.
       */

      if (params.multiInstance) {
        ensureNotFalsy(_internals.leaderElector).awaitLeadership().then(function () {
          if (!instance.closed) {
            mustUseLocalState(instance);
          }
        });
      }

      return instance;
    };

    var _internals = {};

    var _temp8 = function () {
      if (params.multiInstance) {
        var leaderElector = getLokiLeaderElector(storage, params.databaseName);
        _internals.leaderElector = leaderElector;
      } else {
        // optimisation shortcut, directly create db is non multi instance.
        _internals.localState = createLokiLocalState(params, databaseSettings);
        return Promise.resolve(_internals.localState).then(function () {});
      }
    }();

    return Promise.resolve(_temp8 && _temp8.then ? _temp8.then(_temp7) : _temp7(_temp8));
  } catch (e) {
    return Promise.reject(e);
  }
};
export var createLokiLocalState = function createLokiLocalState(params, databaseSettings) {
  try {
    if (!params.options) {
      params.options = {};
    }

    return Promise.resolve(getLokiDatabase(params.databaseName, databaseSettings)).then(function (databaseState) {
      /**
       * Construct loki indexes from RxJsonSchema indexes.
       * TODO what about compound indexes? Are they possible in lokijs?
       */
      var indices = [];

      if (params.schema.indexes) {
        params.schema.indexes.forEach(function (idx) {
          if (!isMaybeReadonlyArray(idx)) {
            indices.push(idx);
          }
        });
      }
      /**
       * LokiJS has no concept of custom primary key, they use a number-id that is generated.
       * To be able to query fast by primary key, we always add an index to the primary.
       */


      var primaryKey = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
      indices.push(primaryKey);
      var collectionOptions = Object.assign({}, params.options.collection, {
        indices: indices,
        unique: [primaryKey]
      }, LOKIJS_COLLECTION_DEFAULT_OPTIONS);
      var collection = databaseState.database.addCollection(params.collectionName, collectionOptions);
      databaseState.collections[params.collectionName] = collection;
      var changesCollectionName = params.collectionName + CHANGES_COLLECTION_SUFFIX;
      var changesCollectionOptions = Object.assign({
        unique: ['eventId'],
        indices: ['sequence']
      }, LOKIJS_COLLECTION_DEFAULT_OPTIONS);
      var changesCollection = databaseState.database.addCollection(changesCollectionName, changesCollectionOptions);
      databaseState.collections[params.collectionName] = changesCollection;
      var ret = {
        databaseState: databaseState,
        collection: collection,
        changesCollection: changesCollection
      };
      return ret;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var instanceId = now();
export var RxStorageInstanceLoki = /*#__PURE__*/function () {
  function RxStorageInstanceLoki(storage, databaseName, collectionName, schema, internals, options, databaseSettings) {
    var _this = this;

    this.changes$ = new Subject();
    this.lastChangefeedSequence = 0;
    this.instanceId = instanceId++;
    this.closed = false;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.databaseSettings = databaseSettings;
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    OPEN_LOKIJS_STORAGE_INSTANCES.add(this);

    if (this.internals.leaderElector) {
      this.internals.leaderElector.awaitLeadership().then(function () {
        // this instance is leader now, so it has to reply to queries from other instances
        ensureNotFalsy(_this.internals.leaderElector).broadcastChannel.addEventListener('message', function (msg) {
          try {
            return Promise.resolve(handleRemoteRequest(_this, msg));
          } catch (e) {
            return Promise.reject(e);
          }
        });
      });
    }
  }
  /**
   * Adds an entry to the changes feed
   * that can be queried to check which documents have been
   * changed since sequence X.
   */


  var _proto = RxStorageInstanceLoki.prototype;

  _proto.addChangeDocumentMeta = function addChangeDocumentMeta(id) {
    try {
      var _this3 = this;

      return Promise.resolve(ensureNotFalsy(_this3.internals.localState)).then(function (localState) {
        if (!_this3.lastChangefeedSequence) {
          var lastDoc = localState.changesCollection.chain().simplesort('sequence', true).limit(1).data()[0];

          if (lastDoc) {
            _this3.lastChangefeedSequence = lastDoc.sequence;
          }
        }

        var nextFeedSequence = _this3.lastChangefeedSequence + 1;
        localState.changesCollection.insert({
          id: id,
          sequence: nextFeedSequence
        });
        _this3.lastChangefeedSequence = nextFeedSequence;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.bulkWrite = function bulkWrite(documentWrites) {
    try {
      var _this5 = this;

      if (documentWrites.length === 0) {
        throw newRxError('P2', {
          args: {
            documentWrites: documentWrites
          }
        });
      }

      return Promise.resolve(mustUseLocalState(_this5)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this5, 'bulkWrite', [documentWrites]);
        }

        var ret = {
          success: {},
          error: {}
        };
        var eventBulk = {
          id: randomCouchString(10),
          events: []
        };
        documentWrites.forEach(function (writeRow) {
          var startTime = now();
          var id = writeRow.document[_this5.primaryPath];
          var documentInDb = localState.collection.by(_this5.primaryPath, id);

          if (!documentInDb) {
            // insert new document
            var newRevision = '1-' + createRevision(writeRow.document);
            /**
             * It is possible to insert already deleted documents,
             * this can happen on replication.
             */

            var insertedIsDeleted = writeRow.document._deleted ? true : false;
            var writeDoc = Object.assign({}, writeRow.document, {
              _rev: newRevision,
              _deleted: insertedIsDeleted,
              // TODO attachments are currently not working with lokijs
              _attachments: {}
            });
            localState.collection.insert(flatClone(writeDoc));

            if (!insertedIsDeleted) {
              _this5.addChangeDocumentMeta(id);

              eventBulk.events.push({
                eventId: getLokiEventKey(false, id, newRevision),
                documentId: id,
                change: {
                  doc: writeDoc,
                  id: id,
                  operation: 'INSERT',
                  previous: null
                },
                startTime: startTime,
                endTime: now()
              });
            }

            ret.success[id] = writeDoc;
          } else {
            // update existing document
            var revInDb = documentInDb._rev; // inserting a deleted document is possible
            // without sending the previous data.

            if (!writeRow.previous && documentInDb._deleted) {
              writeRow.previous = documentInDb;
            }

            if (!writeRow.previous && !documentInDb._deleted || !!writeRow.previous && revInDb !== writeRow.previous._rev) {
              // conflict error
              var err = {
                isError: true,
                status: 409,
                documentId: id,
                writeRow: writeRow
              };
              ret.error[id] = err;
            } else {
              var newRevHeight = getHeightOfRevision(revInDb) + 1;

              var _newRevision = newRevHeight + '-' + createRevision(writeRow.document);

              var isDeleted = !!writeRow.document._deleted;

              var _writeDoc = Object.assign({}, writeRow.document, {
                $loki: documentInDb.$loki,
                _rev: _newRevision,
                _deleted: isDeleted,
                // TODO attachments are currently not working with lokijs
                _attachments: {}
              });

              localState.collection.update(_writeDoc);

              _this5.addChangeDocumentMeta(id);

              var change = null;

              if (writeRow.previous && writeRow.previous._deleted && !_writeDoc._deleted) {
                change = {
                  id: id,
                  operation: 'INSERT',
                  previous: null,
                  doc: stripLokiKey(_writeDoc)
                };
              } else if (writeRow.previous && !writeRow.previous._deleted && !_writeDoc._deleted) {
                change = {
                  id: id,
                  operation: 'UPDATE',
                  previous: writeRow.previous,
                  doc: stripLokiKey(_writeDoc)
                };
              } else if (writeRow.previous && !writeRow.previous._deleted && _writeDoc._deleted) {
                /**
                 * On delete, we send the 'new' rev in the previous property,
                 * to have the equal behavior as pouchdb.
                 */
                var previous = flatClone(writeRow.previous);
                previous._rev = _newRevision;
                change = {
                  id: id,
                  operation: 'DELETE',
                  previous: previous,
                  doc: null
                };
              }

              if (!change) {
                throw newRxError('SNH', {
                  args: {
                    writeRow: writeRow
                  }
                });
              }

              eventBulk.events.push({
                eventId: getLokiEventKey(false, id, _newRevision),
                documentId: id,
                change: change,
                startTime: startTime,
                endTime: now()
              });
              ret.success[id] = stripLokiKey(_writeDoc);
            }
          }
        });
        localState.databaseState.saveQueue.addWrite();

        _this5.changes$.next(eventBulk);

        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.bulkAddRevisions = function bulkAddRevisions(documents) {
    try {
      var _this7 = this;

      if (documents.length === 0) {
        throw newRxError('P3', {
          args: {
            documents: documents
          }
        });
      }

      return Promise.resolve(mustUseLocalState(_this7)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this7, 'bulkAddRevisions', [documents]);
        }

        var eventBulk = {
          id: randomCouchString(10),
          events: []
        };
        documents.forEach(function (docData) {
          var startTime = now();
          var id = docData[_this7.primaryPath];
          var documentInDb = localState.collection.by(_this7.primaryPath, id);

          if (!documentInDb) {
            // document not here, so we can directly insert
            localState.collection.insert(flatClone(docData));
            eventBulk.events.push({
              documentId: id,
              eventId: getLokiEventKey(false, id, docData._rev),
              change: {
                doc: docData,
                id: id,
                operation: 'INSERT',
                previous: null
              },
              startTime: startTime,
              endTime: now()
            });

            _this7.addChangeDocumentMeta(id);
          } else {
            var newWriteRevision = parseRevision(docData._rev);
            var oldRevision = parseRevision(documentInDb._rev);
            var mustUpdate = false;

            if (newWriteRevision.height !== oldRevision.height) {
              // height not equal, compare base on height
              if (newWriteRevision.height > oldRevision.height) {
                mustUpdate = true;
              }
            } else if (newWriteRevision.hash > oldRevision.hash) {
              // equal height but new write has the 'winning' hash
              mustUpdate = true;
            }

            if (mustUpdate) {
              var storeAtLoki = flatClone(docData);
              storeAtLoki.$loki = documentInDb.$loki;
              localState.collection.update(storeAtLoki);
              var change = null;

              if (documentInDb._deleted && !docData._deleted) {
                change = {
                  id: id,
                  operation: 'INSERT',
                  previous: null,
                  doc: docData
                };
              } else if (!documentInDb._deleted && !docData._deleted) {
                change = {
                  id: id,
                  operation: 'UPDATE',
                  previous: stripLokiKey(documentInDb),
                  doc: docData
                };
              } else if (!documentInDb._deleted && docData._deleted) {
                change = {
                  id: id,
                  operation: 'DELETE',
                  previous: stripLokiKey(documentInDb),
                  doc: null
                };
              } else if (documentInDb._deleted && docData._deleted) {
                change = null;
              }

              if (change) {
                eventBulk.events.push({
                  documentId: id,
                  eventId: getLokiEventKey(false, id, docData._rev),
                  change: change,
                  startTime: startTime,
                  endTime: now()
                });

                _this7.addChangeDocumentMeta(id);
              }
            }
          }
        });
        localState.databaseState.saveQueue.addWrite();

        _this7.changes$.next(eventBulk);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.findDocumentsById = function findDocumentsById(ids, deleted) {
    try {
      var _this9 = this;

      return Promise.resolve(mustUseLocalState(_this9)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this9, 'findDocumentsById', [ids, deleted]);
        }

        var ret = {};
        ids.forEach(function (id) {
          var documentInDb = localState.collection.by(_this9.primaryPath, id);

          if (documentInDb && (!documentInDb._deleted || deleted)) {
            ret[id] = stripLokiKey(documentInDb);
          }
        });
        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.query = function query(preparedQuery) {
    try {
      var _this11 = this;

      return Promise.resolve(mustUseLocalState(_this11)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this11, 'query', [preparedQuery]);
        }

        var query = localState.collection.chain().find(preparedQuery.selector);

        if (preparedQuery.sort) {
          query = query.sort(getLokiSortComparator(_this11.schema, preparedQuery));
        }
        /**
         * Offset must be used before limit in LokiJS
         * @link https://github.com/techfort/LokiJS/issues/570
         */


        if (preparedQuery.skip) {
          query = query.offset(preparedQuery.skip);
        }

        if (preparedQuery.limit) {
          query = query.limit(preparedQuery.limit);
        }

        var foundDocuments = query.data().map(function (lokiDoc) {
          return stripLokiKey(lokiDoc);
        });
        return {
          documents: foundDocuments
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.getAttachmentData = function getAttachmentData(_documentId, _attachmentId) {
    throw new Error('Attachments are not implemented in the lokijs RxStorage. Make a pull request.');
  };

  _proto.getChangedDocuments = function getChangedDocuments(options) {
    try {
      var _this13 = this;

      return Promise.resolve(mustUseLocalState(_this13)).then(function (localState) {
        var _sequence;

        if (!localState) {
          return requestRemoteInstance(_this13, 'getChangedDocuments', [options]);
        }

        var desc = options.direction === 'before';
        var operator = options.direction === 'after' ? '$gt' : '$lt';
        var query = localState.changesCollection.chain().find({
          sequence: (_sequence = {}, _sequence[operator] = options.sinceSequence, _sequence)
        }).simplesort('sequence', desc);

        if (options.limit) {
          query = query.limit(options.limit);
        }

        var changedDocuments = query.data().map(function (result) {
          return {
            id: result.id,
            sequence: result.sequence
          };
        });
        var useForLastSequence = !desc ? lastOfArray(changedDocuments) : changedDocuments[0];
        var ret = {
          changedDocuments: changedDocuments,
          lastSequence: useForLastSequence ? useForLastSequence.sequence : options.sinceSequence
        };
        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto.close = function close() {
    try {
      var _temp3 = function _temp3() {
        removeLokiLeaderElectorReference(_this15.storage, _this15.databaseName);
      };

      var _this15 = this;

      _this15.closed = true;

      _this15.changes$.complete();

      OPEN_LOKIJS_STORAGE_INSTANCES["delete"](_this15);

      var _temp4 = function () {
        if (_this15.internals.localState) {
          return Promise.resolve(_this15.internals.localState).then(function (localState) {
            return Promise.resolve(getLokiDatabase(_this15.databaseName, _this15.databaseSettings)).then(function (dbState) {
              return Promise.resolve(dbState.saveQueue.run()).then(function () {
                return Promise.resolve(closeLokiCollections(_this15.databaseName, [localState.collection, localState.changesCollection])).then(function () {});
              });
            });
          });
        }
      }();

      return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.remove = function remove() {
    try {
      var _this17 = this;

      return Promise.resolve(mustUseLocalState(_this17)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this17, 'remove', []);
        }

        localState.databaseState.database.removeCollection(_this17.collectionName);
        localState.databaseState.database.removeCollection(localState.changesCollection.name);
        return _this17.close();
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStorageInstanceLoki;
}();
//# sourceMappingURL=rx-storage-instance-loki.js.map