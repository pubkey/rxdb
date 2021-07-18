import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";

/*
 * Instead of listening to pouch.changes,
 * we overwrite pouchdbs bulkDocs()
 * and create our own event stream, this will work more reliable
 * and has less strange behaviors.
 * Also we can better define what data we need for our events.
 * @link http://jsbin.com/pagebi/1/edit?js,output
 * @link https://github.com/pubkey/rxdb/blob/1f4115b69bdacbb853af9c637d70f5f184d4e474/src/rx-storage-pouchdb.ts#L273
 */
import PouchDBCore from 'pouchdb-core';
import { Subject } from 'rxjs';
import { flatClone, now } from '../../util';
import { newRxError } from '../../rx-error';
import { ObliviousSet } from 'oblivious-set'; // ensure only added once

var addedToPouch = false;
export var EVENT_EMITTER_BY_POUCH_INSTANCE = new Map();
export function getCustomEventEmitterByPouch(pouch) {
  var key = [pouch.name, pouch.adapter].join('|');
  var emitter = EVENT_EMITTER_BY_POUCH_INSTANCE.get(key);

  if (!emitter) {
    emitter = {
      subject: new Subject(),
      obliviousSet: new ObliviousSet(60 * 1000)
    };
    EVENT_EMITTER_BY_POUCH_INSTANCE.set(key, emitter);
  }

  return emitter;
}
var i = 0;
export function addCustomEventsPluginToPouch() {
  if (addedToPouch) {
    return;
  }

  addedToPouch = true;
  var oldBulkDocs = PouchDBCore.prototype.bulkDocs;

  var newBulkDocs = /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(body, options, callback) {
      var _this = this;

      var startTime, t, docs, previousDocs, ids, viaChanges, previousDocsResult, deeperOptions;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              startTime = now();
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
                _context2.next = 7;
                break;
              }

              throw newRxError('SNH', {
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
                _context2.next = 18;
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

              _context2.next = 12;
              return this.changes({
                live: false,
                since: 0,
                doc_ids: ids,
                style: 'all_docs'
              });

            case 12:
              viaChanges = _context2.sent;
              _context2.next = 15;
              return Promise.all(viaChanges.results.map( /*#__PURE__*/function () {
                var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(result) {
                  var firstDoc;
                  return _regeneratorRuntime.wrap(function _callee$(_context) {
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
              previousDocsResult = _context2.sent;
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
              deeperOptions = flatClone(options);
              deeperOptions.isDeeper = true;
              return _context2.abrupt("return", oldBulkDocs.call(this, docs, deeperOptions, function (err, result) {
                if (err) {
                  if (callback) {
                    callback(err);
                  } else {
                    throw err;
                  }
                } else {
                  if (!options.isDeeper) {
                    var endTime = now();
                    var emitData = {
                      emitId: t,
                      writeDocs: docs,
                      writeOptions: options,
                      writeResult: result,
                      previousDocs: previousDocs,
                      startTime: startTime,
                      endTime: endTime
                    };
                    var emitter = getCustomEventEmitterByPouch(_this);
                    emitter.subject.next(emitData);
                  }

                  if (callback) {
                    callback(null, result);
                  } else {
                    return result;
                  }
                }
              }));

            case 21:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    return function newBulkDocs(_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }();

  PouchDBCore.plugin({
    bulkDocs: newBulkDocs
  });
}
//# sourceMappingURL=custom-events-plugin.js.map