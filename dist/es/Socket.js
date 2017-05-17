function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

import * as RxCollection from './RxCollection';
import * as RxChangeEvent from './RxChangeEvent';
import * as RxBroadcastChannel from './RxBroadcastChannel';
import * as util from './util';

const EVENT_TTL = 5000; // after this age, events will be deleted
const PULL_TIME = RxBroadcastChannel.canIUse() ? EVENT_TTL / 2 : 200;

class Socket {

    constructor(database) {
        this.database = database;
        this.token = database.token;
        this.subs = [];

        this.pullCount = 0;
        this.pull_running = false;
        this.lastPull = new Date().getTime();
        this.recievedEvents = {};

        this.bc = RxBroadcastChannel.create(this.database, 'socket');
        this.messages$ = new util.Rx.Subject();
    }
    get $() {
        return this.messages$.asObservable();
    }

    prepare() {
        var _this = this;

        return _asyncToGenerator(function* () {
            // create socket-collection
            _this.pouch = _this.database._spawnPouchDB('_socket', 0, {
                auto_compaction: false, // this is false because its done manually at .pull()
                revs_limit: 1
            });

            // pull on BroadcastChannel-message
            if (_this.bc) {
                _this.subs.push(_this.bc.$.filter(function (msg) {
                    return msg.type == 'pull';
                }).subscribe(function (msg) {
                    return _this.pull();
                }));
            }

            // pull on intervall
            const autoPull = util.Rx.Observable.interval(PULL_TIME).filter(function (c) {
                return _this.messages$.observers.length > 0;
            }).subscribe(function (x) {
                return _this.pull();
            });
            _this.subs.push(autoPull);

            return;
        })();
    }

    /**
     * write the given event to the socket
     */
    write(changeEvent) {
        var _this2 = this;

        return _asyncToGenerator(function* () {
            const socketDoc = changeEvent.toJSON();
            delete socketDoc.db;

            // TODO find a way to getAll on local documents
            //  socketDoc._id = '_local/' + util.fastUnsecureHash(socketDoc);
            socketDoc._id = '' + util.fastUnsecureHash(socketDoc) + socketDoc.t;
            yield _this2.pouch.put(socketDoc);
            _this2.bc && (yield _this2.bc.write('pull'));
            return true;
        })();
    }

    /**
     * get all docs from the socket-collection
     */
    fetchDocs() {
        var _this3 = this;

        return _asyncToGenerator(function* () {
            const result = yield _this3.pouch.allDocs({
                include_docs: true
            });
            return result.rows.map(function (row) {
                return row.doc;
            });
        })();
    }
    deleteDoc(doc) {
        var _this4 = this;

        return _asyncToGenerator(function* () {
            try {
                yield _this4.pouch.remove(doc);
            } catch (e) {}
        })();
    }

    /**
     * grab all new events from the socket-pouchdb
     * and throw them into this.messages$
     */
    pull() {
        var _this5 = this;

        return _asyncToGenerator(function* () {
            if (_this5.isPulling) {
                _this5._repullAfter = true;
                return false;
            }
            _this5.isPulling = true;
            _this5.pullCount++;

            const minTime = _this5.lastPull - 100; // TODO evaluate this value (100)
            const docs = yield _this5.fetchDocs();
            docs.filter(function (doc) {
                return doc.it != _this5.token;
            }) // do not get events emitted by self
            // do not get events older than minTime
            .filter(function (doc) {
                return doc.t > minTime;
            })
            // sort timestamp
            .sort(function (a, b) {
                if (a.t > b.t) return 1;
                return -1;
            }).map(function (doc) {
                return RxChangeEvent.fromJSON(doc);
            })
            // make sure the same event is not emitted twice
            .filter(function (cE) {
                if (_this5.recievedEvents[cE.hash]) return false;
                return _this5.recievedEvents[cE.hash] = new Date().getTime();
            })
            // prevent memory leak of this.recievedEvents
            .filter(function (cE) {
                return setTimeout(function () {
                    return delete _this5.recievedEvents[cE.hash];
                }, EVENT_TTL * 3);
            })
            // emit to messages
            .forEach(function (cE) {
                return _this5.messages$.next(cE);
            });

            // delete old documents
            const maxAge = new Date().getTime() - EVENT_TTL;
            const delDocs = docs.filter(function (doc) {
                return doc.t < maxAge;
            }).map(function (doc) {
                return _this5.deleteDoc(doc);
            });
            if (delDocs.length > 0) yield _this5.pouch.compact();

            _this5.lastPull = new Date().getTime();
            _this5.isPulling = false;
            if (_this5._repull) {
                _this5._repull = false;
                _this5.pull();
            }
            return true;
        })();
    }

    destroy() {
        this.subs.map(sub => sub.unsubscribe());
        if (this.bc) this.bc.destroy();
    }

}

export let create = (() => {
    var _ref = _asyncToGenerator(function* (database) {
        const socket = new Socket(database);
        yield socket.prepare();
        return socket;
    });

    return function create(_x) {
        return _ref.apply(this, arguments);
    };
})();

export { EVENT_TTL, PULL_TIME };