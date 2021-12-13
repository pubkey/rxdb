"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EVENT_EMITTER_BY_POUCH_INSTANCE = void 0;
exports.addCustomEventsPluginToPouch = addCustomEventsPluginToPouch;
exports.changeEventToNormal = changeEventToNormal;
exports.eventEmitDataToStorageEvents = eventEmitDataToStorageEvents;
exports.getCustomEventEmitterByPouch = getCustomEventEmitterByPouch;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _pouchdbCore = _interopRequireDefault(require("pouchdb-core"));

var _rxjs = require("rxjs");

var _util = require("../../util");

var _rxError = require("../../rx-error");

var _pouchdbHelper = require("./pouchdb-helper");

/*
 * Instead of listening to pouch.changes,
 * we overwrite pouchdbs bulkDocs()
 * and create our own event stream, this will work more reliable
 * and has less strange behaviors.
 * Also we can better define what data we need for our events.
 * @link http://jsbin.com/pagebi/1/edit?js,output
 * @link https://github.com/pubkey/rxdb/blob/1f4115b69bdacbb853af9c637d70f5f184d4e474/src/rx-storage-pouchdb.ts#L273
 */
// ensure only added once
var addedToPouch = false;
var EVENT_EMITTER_BY_POUCH_INSTANCE = new Map();
exports.EVENT_EMITTER_BY_POUCH_INSTANCE = EVENT_EMITTER_BY_POUCH_INSTANCE;

function getCustomEventEmitterByPouch(pouch) {
  var key = [pouch.name, pouch.adapter].join('|');
  var emitter = EVENT_EMITTER_BY_POUCH_INSTANCE.get(key);

  if (!emitter) {
    emitter = {
      subject: new _rxjs.Subject()
    };
    EVENT_EMITTER_BY_POUCH_INSTANCE.set(key, emitter);
  }

  return emitter;
}

var i = 0;

function addCustomEventsPluginToPouch() {
  if (addedToPouch) {
    return;
  }

  addedToPouch = true;
  var oldBulkDocs = _pouchdbCore["default"].prototype.bulkDocs;

  var newBulkDocs = /*#__PURE__*/function () {
    var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(body, options, callback) {
      var _this = this;

      var startTime, t, docs, previousDocs, ids, viaChanges, previousDocsResult, deeperOptions;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              startTime = (0, _util.now)();
              t = i++; // normalize input

              if (typeof options === 'function') {
                callback = options;
                options = {};
              }

              if (!options) {
                options = {};
              }

              if (Array.isArray(body)) {
                docs = body;
              } else if (body === undefined) {
                docs = [];
              } else {
                docs = body.docs;

                if (body.hasOwnProperty('new_edits')) {
                  options.new_edits = body.new_edits;
                }
              }

              if (!(docs.length === 0)) {
                _context3.next = 7;
                break;
              }

              throw (0, _rxError.newRxError)('SNH', {
                args: {
                  body: body,
                  options: options
                }
              });

            case 7:
              /**
               * If new_edits=false we have to first find the current state
               * of the document and can later check if the state was changed
               * because a new revision was written and we have to emit an event.
               */
              previousDocs = new Map();

              if (!(options.hasOwnProperty('new_edits') && options.new_edits === false)) {
                _context3.next = 18;
                break;
              }

              ids = docs.map(function (doc) {
                return doc._id;
              });
              /**
               * Pouchdb does not return deleted documents via allDocs()
               * So have to do use our hack with getting the newest revisions from the
               * changes.
               */

              _context3.next = 12;
              return this.changes({
                live: false,
                since: 0,
                doc_ids: ids,
                style: 'all_docs'
              });

            case 12:
              viaChanges = _context3.sent;
              _context3.next = 15;
              return Promise.all(viaChanges.results.map( /*#__PURE__*/function () {
                var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(result) {
                  var firstDoc;
                  return _regenerator["default"].wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          _context.next = 2;
                          return _this.get(result.id, {
                            rev: result.changes[0].rev,
                            deleted: 'ok',
                            revs: options.set_new_edit_as_latest_revision ? true : false,
                            style: 'all_docs'
                          });

                        case 2:
                          firstDoc = _context.sent;
                          return _context.abrupt("return", firstDoc);

                        case 4:
                        case "end":
                          return _context.stop();
                      }
                    }
                  }, _callee);
                }));

                return function (_x4) {
                  return _ref2.apply(this, arguments);
                };
              }()));

            case 15:
              previousDocsResult = _context3.sent;
              previousDocsResult.forEach(function (doc) {
                return previousDocs.set(doc._id, doc);
              });

              if (options.set_new_edit_as_latest_revision) {
                docs.forEach(function (doc) {
                  var id = doc._id;
                  var previous = previousDocs.get(id);

                  if (previous) {
                    var splittedRev = doc._rev.split('-');

                    var revHeight = parseInt(splittedRev[0], 10);
                    var revLabel = splittedRev[1];

                    if (!previous._revisions) {
                      previous._revisions = {
                        ids: []
                      };
                    }

                    doc._revisions = {
                      start: revHeight,
                      ids: previous._revisions.ids
                    };

                    doc._revisions.ids.unshift(revLabel);

                    delete previous._revisions;
                  }
                });
              }

            case 18:
              /**
               * pouchdb calls this function again with transformed input.
               * This would lead to duplicate events. So we marks the deeper calls via the options
               * parameter and do not emit events if it is set.
               */
              deeperOptions = (0, _util.flatClone)(options);
              deeperOptions.isDeeper = true;
              return _context3.abrupt("return", oldBulkDocs.call(this, docs, deeperOptions, function (err, result) {
                if (err) {
                  if (callback) {
                    callback(err);
                  } else {
                    throw err;
                  }
                } else {
                  return (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
                    var endTime, emitData, events, eventBulk, emitter;
                    return _regenerator["default"].wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            if (options.isDeeper) {
                              _context2.next = 9;
                              break;
                            }

                            endTime = (0, _util.now)();
                            emitData = {
                              emitId: t,
                              writeDocs: docs,
                              writeOptions: options,
                              writeResult: result,
                              previousDocs: previousDocs,
                              startTime: startTime,
                              endTime: endTime
                            };
                            _context2.next = 5;
                            return eventEmitDataToStorageEvents('_id', emitData);

                          case 5:
                            events = _context2.sent;
                            eventBulk = {
                              id: (0, _util.randomCouchString)(10),
                              events: events
                            };
                            emitter = getCustomEventEmitterByPouch(_this);
                            emitter.subject.next(eventBulk);

                          case 9:
                            if (!callback) {
                              _context2.next = 13;
                              break;
                            }

                            callback(null, result);
                            _context2.next = 14;
                            break;

                          case 13:
                            return _context2.abrupt("return", result);

                          case 14:
                          case "end":
                            return _context2.stop();
                        }
                      }
                    }, _callee2);
                  }))();
                }
              }));

            case 21:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    return function newBulkDocs(_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }();

  _pouchdbCore["default"].plugin({
    bulkDocs: newBulkDocs
  });
}

function eventEmitDataToStorageEvents(_x5, _x6) {
  return _eventEmitDataToStorageEvents.apply(this, arguments);
}

function _eventEmitDataToStorageEvents() {
  _eventEmitDataToStorageEvents = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(primaryPath, emitData) {
    var ret, writeDocsById, writeMap;
    return _regenerator["default"].wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            ret = [];

            if (!(emitData.writeOptions.hasOwnProperty('new_edits') && !emitData.writeOptions.new_edits)) {
              _context7.next = 6;
              break;
            }

            _context7.next = 4;
            return Promise.all(emitData.writeDocs.map( /*#__PURE__*/function () {
              var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(writeDoc) {
                var id, previousDoc, event, changeEvent;
                return _regenerator["default"].wrap(function _callee4$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        id = writeDoc._id;
                        writeDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(primaryPath, writeDoc);
                        _context4.next = 4;
                        return (0, _pouchdbHelper.writeAttachmentsToAttachments)(writeDoc._attachments);

                      case 4:
                        writeDoc._attachments = _context4.sent;
                        previousDoc = emitData.previousDocs.get(id);

                        if (previousDoc) {
                          previousDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(primaryPath, previousDoc);
                        }

                        if (!(previousDoc && (0, _util.getHeightOfRevision)(previousDoc._rev) > (0, _util.getHeightOfRevision)(writeDoc._rev))) {
                          _context4.next = 9;
                          break;
                        }

                        return _context4.abrupt("return");

                      case 9:
                        if (!(!previousDoc && writeDoc._deleted)) {
                          _context4.next = 11;
                          break;
                        }

                        return _context4.abrupt("return");

                      case 11:
                        if (!(previousDoc && previousDoc._deleted && writeDoc._deleted)) {
                          _context4.next = 13;
                          break;
                        }

                        return _context4.abrupt("return");

                      case 13:
                        if (!((!previousDoc || previousDoc._deleted) && !writeDoc._deleted)) {
                          _context4.next = 17;
                          break;
                        }

                        // was insert
                        event = {
                          operation: 'INSERT',
                          doc: writeDoc,
                          id: id,
                          previous: null
                        };
                        _context4.next = 27;
                        break;

                      case 17:
                        if (!(writeDoc._deleted && previousDoc && !previousDoc._deleted)) {
                          _context4.next = 22;
                          break;
                        }

                        // was delete
                        previousDoc._rev = writeDoc._rev;
                        event = {
                          operation: 'DELETE',
                          doc: null,
                          id: id,
                          previous: previousDoc
                        };
                        _context4.next = 27;
                        break;

                      case 22:
                        if (!previousDoc) {
                          _context4.next = 26;
                          break;
                        }

                        // was update
                        event = {
                          operation: 'UPDATE',
                          doc: writeDoc,
                          id: id,
                          previous: previousDoc
                        };
                        _context4.next = 27;
                        break;

                      case 26:
                        throw (0, _rxError.newRxError)('SNH', {
                          args: {
                            writeDoc: writeDoc
                          }
                        });

                      case 27:
                        changeEvent = changeEventToNormal(primaryPath, event, emitData.startTime, emitData.endTime);
                        ret.push(changeEvent);

                      case 29:
                      case "end":
                        return _context4.stop();
                    }
                  }
                }, _callee4);
              }));

              return function (_x7) {
                return _ref4.apply(this, arguments);
              };
            }()));

          case 4:
            _context7.next = 16;
            break;

          case 6:
            if (!(!emitData.writeOptions.custom || emitData.writeOptions.custom && !emitData.writeOptions.custom.writeRowById)) {
              _context7.next = 13;
              break;
            }

            writeDocsById = new Map();
            emitData.writeDocs.forEach(function (writeDoc) {
              return writeDocsById.set(writeDoc._id, writeDoc);
            });
            _context7.next = 11;
            return Promise.all(emitData.writeResult.map( /*#__PURE__*/function () {
              var _ref5 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(resultRow) {
                var id, writeDoc, event, changeEvent;
                return _regenerator["default"].wrap(function _callee5$(_context5) {
                  while (1) {
                    switch (_context5.prev = _context5.next) {
                      case 0:
                        id = resultRow.id;

                        if (!(id.startsWith(_pouchdbHelper.POUCHDB_DESIGN_PREFIX) || id.startsWith(_pouchdbHelper.POUCHDB_LOCAL_PREFIX))) {
                          _context5.next = 3;
                          break;
                        }

                        return _context5.abrupt("return");

                      case 3:
                        writeDoc = (0, _util.getFromMapOrThrow)(writeDocsById, resultRow.id);
                        writeDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(primaryPath, writeDoc);
                        _context5.next = 7;
                        return (0, _pouchdbHelper.writeAttachmentsToAttachments)(writeDoc._attachments);

                      case 7:
                        writeDoc._attachments = _context5.sent;
                        writeDoc = (0, _util.flatClone)(writeDoc);
                        writeDoc._rev = resultRow.rev;
                        event = (0, _pouchdbHelper.pouchChangeRowToChangeEvent)(primaryPath, writeDoc);
                        changeEvent = changeEventToNormal(primaryPath, event);
                        ret.push(changeEvent);

                      case 13:
                      case "end":
                        return _context5.stop();
                    }
                  }
                }, _callee5);
              }));

              return function (_x8) {
                return _ref5.apply(this, arguments);
              };
            }()));

          case 11:
            _context7.next = 16;
            break;

          case 13:
            writeMap = emitData.writeOptions.custom.writeRowById;
            _context7.next = 16;
            return Promise.all(emitData.writeResult.map( /*#__PURE__*/function () {
              var _ref6 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(resultRow) {
                var id, writeRow, newDoc, event, previousDoc, changeEvent;
                return _regenerator["default"].wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        if (!resultRow.error) {
                          _context6.next = 2;
                          break;
                        }

                        return _context6.abrupt("return");

                      case 2:
                        id = resultRow.id;
                        writeRow = (0, _util.getFromMapOrThrow)(writeMap, id);
                        newDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(primaryPath, writeRow.document);
                        _context6.next = 7;
                        return (0, _pouchdbHelper.writeAttachmentsToAttachments)(newDoc._attachments);

                      case 7:
                        newDoc._attachments = _context6.sent;
                        newDoc._rev = resultRow.rev;

                        if (!(!writeRow.previous || writeRow.previous._deleted)) {
                          _context6.next = 13;
                          break;
                        }

                        // was insert
                        event = {
                          operation: 'INSERT',
                          doc: newDoc,
                          id: id,
                          previous: null
                        };
                        _context6.next = 23;
                        break;

                      case 13:
                        if (!writeRow.document._deleted) {
                          _context6.next = 22;
                          break;
                        }

                        // was delete
                        // we need to add the new revision to the previous doc
                        // so that the eventkey is calculated correctly.
                        // Is this a hack? idk.
                        previousDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(primaryPath, writeRow.previous);
                        _context6.next = 17;
                        return (0, _pouchdbHelper.writeAttachmentsToAttachments)(previousDoc._attachments);

                      case 17:
                        previousDoc._attachments = _context6.sent;
                        previousDoc._rev = resultRow.rev;
                        event = {
                          operation: 'DELETE',
                          doc: null,
                          id: resultRow.id,
                          previous: previousDoc
                        };
                        _context6.next = 23;
                        break;

                      case 22:
                        // was update
                        event = {
                          operation: 'UPDATE',
                          doc: newDoc,
                          id: resultRow.id,
                          previous: writeRow.previous
                        };

                      case 23:
                        if (writeRow.document._deleted && (!writeRow.previous || writeRow.previous._deleted)) {
                          /**
                           * A deleted document was newly added to the storage engine,
                           * do not emit an event.
                           */
                        } else {
                          changeEvent = changeEventToNormal(emitData.writeOptions.custom.primaryPath, event, emitData.startTime, emitData.endTime);
                          ret.push(changeEvent);
                        }

                      case 24:
                      case "end":
                        return _context6.stop();
                    }
                  }
                }, _callee6);
              }));

              return function (_x9) {
                return _ref6.apply(this, arguments);
              };
            }()));

          case 16:
            return _context7.abrupt("return", ret);

          case 17:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7);
  }));
  return _eventEmitDataToStorageEvents.apply(this, arguments);
}

function changeEventToNormal(primaryPath, change, startTime, endTime) {
  var doc = change.operation === 'DELETE' ? change.previous : change.doc;
  var primary = doc[primaryPath];
  var storageChangeEvent = {
    eventId: (0, _pouchdbHelper.getEventKey)(false, primary, doc._rev),
    documentId: primary,
    change: change,
    startTime: startTime,
    endTime: endTime
  };
  return storageChangeEvent;
}
//# sourceMappingURL=custom-events-plugin.js.map