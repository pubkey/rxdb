function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * this handles the leader-election for the given RxDatabase-instance
 */

import * as unload from 'unload';

import * as util from './util';
import * as RxChangeEvent from './RxChangeEvent';
import * as RxBroadcastChannel from './RxBroadcastChannel';

const documentID = '_local/leader';
const SIGNAL_TIME = 500; // TODO evaluate this time

class LeaderElector {
    constructor(database) {

        // things that must be cleared on destroy
        this.subs = [];
        this.unloads = [];

        this.database = database;
        this.token = this.database.token;

        this.isLeader = false;
        this.becomeLeader$ = new util.Rx.BehaviorSubject({
            isLeader: false
        });

        this.isDead = false;
        this.isApplying = false;
        this.isWaiting = false;

        this.bc = RxBroadcastChannel.create(this.database, 'leader');
        this.electionChannel = this.bc ? 'broadcast' : 'socket';
    }

    prepare() {
        return _asyncToGenerator(function* () {})();
    }

    createLeaderObject() {
        return {
            _id: documentID,
            is: '', // token of leader-instance
            apply: '', // token of applying instance
            t: 0 // time when the leader send a signal the last time
        };
    }
    getLeaderObject() {
        var _this = this;

        return _asyncToGenerator(function* () {
            let obj;
            try {
                obj = yield _this.database._adminPouch.get(documentID);
            } catch (e) {
                obj = _this.createLeaderObject();
                const ret = yield _this.database._adminPouch.put(obj);
                obj._rev = ret.rev;
            }
            return obj;
        })();
    }

    setLeaderObject(newObj) {
        var _this2 = this;

        return _asyncToGenerator(function* () {
            yield _this2.database._adminPouch.put(newObj);
            return;
        })();
    }

    /**
     * starts applying for leadership
     */
    applyOnce() {
        var _this3 = this;

        return _asyncToGenerator(function* () {
            if (_this3.isLeader) return false;
            if (_this3.isDead) return false;
            if (_this3.isApplying) return false;
            _this3.isApplying = true;

            const elected = yield _this3['apply_' + _this3.electionChannel]();

            if (elected) {
                // I am leader now
                yield _this3.beLeader();
            }

            _this3.isApplying = false;
            return true;
        })();
    }

    /**
     * apply via socket
     * (critical on chrome with indexedDB due to write-locks)
     */
    apply_socket() {
        var _this4 = this;

        return _asyncToGenerator(function* () {
            try {
                let leaderObj = yield _this4.getLeaderObject();
                const minTime = new Date().getTime() - SIGNAL_TIME * 2;

                if (leaderObj.t >= minTime) throw new Error('someone else is applying/leader');
                // write applying to db
                leaderObj.apply = _this4.token;
                leaderObj.t = new Date().getTime();
                yield _this4.setLeaderObject(leaderObj);

                // w8 one cycle
                yield util.promiseWait(SIGNAL_TIME * 0.5);

                // check if someone overwrote it
                leaderObj = yield _this4.getLeaderObject();
                if (leaderObj.apply != _this4.token) throw new Error('someone else overwrote apply');

                return true;
            } catch (e) {
                return false;
            }
        })();
    }

    /**
     * apply via BroadcastChannel-API
     * (better performance than socket)
     */
    apply_broadcast() {
        var _this5 = this;

        return _asyncToGenerator(function* () {

            const applyTime = new Date().getTime();
            const subs = [];
            const errors = [];

            const whileNoError = (() => {
                var _ref = _asyncToGenerator(function* () {
                    subs.push(_this5.bc.$.filter(function (msg) {
                        return !!_this5.isApplying;
                    }).filter(function (msg) {
                        return msg.t >= applyTime;
                    }).filter(function (msg) {
                        return msg.type == 'apply';
                    }).filter(function (msg) {
                        if (msg.data < applyTime || msg.data == applyTime && msg.it > _this5.token) return true;else return false;
                    }).filter(function (msg) {
                        return errors.length < 1;
                    }).subscribe(function (msg) {
                        return errors.push('other is applying:' + msg.it);
                    }));
                    subs.push(_this5.bc.$.filter(function (msg) {
                        return !!_this5.isApplying;
                    }).filter(function (msg) {
                        return msg.t >= applyTime;
                    }).filter(function (msg) {
                        return msg.type == 'tell';
                    }).filter(function (msg) {
                        return errors.length < 1;
                    }).subscribe(function (msg) {
                        return errors.push('other is leader' + msg.it);
                    }));
                    subs.push(_this5.bc.$.filter(function (msg) {
                        return !!_this5.isApplying;
                    }).filter(function (msg) {
                        return msg.type == 'apply';
                    }).filter(function (msg) {
                        if (msg.data > applyTime || msg.data == applyTime && msg.it > _this5.token) return true;else return false;
                    }).subscribe(function (msg) {
                        return _this5.bc.write('apply', applyTime);
                    }));

                    let circles = 3;
                    while (circles > 0) {
                        circles--;
                        yield _this5.bc.write('apply', applyTime);
                        yield util.promiseWait(300); // give others time to respond
                        if (errors.length > 0) return false;
                    }
                    return true;
                });

                return function whileNoError() {
                    return _ref.apply(this, arguments);
                };
            })();
            const ret = yield whileNoError();
            subs.map(function (sub) {
                return sub.unsubscribe();
            });
            return ret;
        })();
    }

    leaderSignal() {
        var _this6 = this;

        return _asyncToGenerator(function* () {
            if (_this6.leaderSignal_run) return;
            _this6.leaderSignal_run = true;
            switch (_this6.electionChannel) {
                case 'broadcast':
                    yield _this6.bc.write('tell');
                    break;
                case 'socket':
                    let success = false;
                    while (!success) {
                        try {
                            const leaderObj = yield _this6.getLeaderObject();
                            leaderObj.is = _this6.token;
                            leaderObj.apply = _this6.token;
                            leaderObj.t = new Date().getTime();
                            yield _this6.setLeaderObject(leaderObj);
                            success = true;
                        } catch (e) {
                            console.dir(e);
                        }
                    }
                    break;
            }
            _this6.leaderSignal_run = false;
            return;
        })();
    }

    /**
     * assigns leadership to this instance
     */
    beLeader() {
        var _this7 = this;

        return _asyncToGenerator(function* () {
            if (_this7.isDead) return false;
            if (_this7.isLeader) return false;
            _this7.isLeader = true;

            _this7.becomeLeader$.next({
                isLeader: true
            });

            _this7.applyInterval && _this7.applyInterval.unsubscribe();
            yield _this7.leaderSignal();

            // signal leadership on interval
            switch (_this7.electionChannel) {
                case 'broadcast':
                    _this7.signalLeadership = _this7.bc.$.filter(function (m) {
                        return !!_this7.isLeader;
                    })
                    // BUGFIX: avoids loop-hole when for whatever reason 2 are leader
                    .filter(function (msg) {
                        return msg.type != 'tell';
                    }).subscribe(function (msg) {
                        return _this7.leaderSignal();
                    });
                    _this7.subs.push(_this7.signalLeadership);
                    break;
                case 'socket':
                    _this7.signalLeadership = util.Rx.Observable.interval(SIGNAL_TIME).filter(function (m) {
                        return !!_this7.isLeader;
                    }).subscribe(function () {
                        return _this7.leaderSignal();
                    });
                    _this7.subs.push(_this7.signalLeadership);
                    break;
            }

            // this.die() on unload
            _this7.unloads.push(unload.add(function () {
                _this7.bc.write('death');
                _this7.die();
            }));
            return true;
        })();
    }

    die() {
        var _this8 = this;

        return _asyncToGenerator(function* () {
            if (!_this8.isLeader) return false;
            if (_this8.isDead) return false;
            _this8.isDead = true;
            _this8.isLeader = false;

            if (_this8.signalLeadership) _this8.signalLeadership.unsubscribe();

            // force.write to db
            switch (_this8.electionChannel) {
                case 'broadcast':
                    yield _this8.bc.write('death');
                    break;
                case 'socket':
                    let success = false;
                    while (!success) {
                        try {
                            const leaderObj = yield _this8.getLeaderObject();
                            leaderObj.t = 0;
                            yield _this8.setLeaderObject(leaderObj);
                            success = true;
                        } catch (e) {}
                    }
                    break;
            }
            return true;
        })();
    }

    /**
     * @return {Promise} promise which resolve when the instance becomes leader
     */
    waitForLeadership() {
        var _this9 = this;

        return _asyncToGenerator(function* () {
            if (_this9.isLeader) return Promise.resolve(true);

            const subs = [];

            if (!_this9.isWaiting) {
                _this9.isWaiting = true;

                // apply now
                _this9.applyOnce();

                switch (_this9.electionChannel) {
                    case 'broadcast':
                        _this9.subs.push(_this9.bc.$.filter(function (msg) {
                            return msg.type == 'death';
                        }).subscribe(function (msg) {
                            return _this9.applyOnce();
                        }));
                        break;
                    case 'socket':
                        // apply on interval
                        _this9.applyInterval = util.Rx.Observable.interval(SIGNAL_TIME * 2).subscribe(function (x) {
                            return _this9.applyOnce();
                        });
                        _this9.subs.push(_this9.applyInterval);
                        break;
                }
            }
            return new Promise(function (res) {
                const sub = _this9.becomeLeader$.asObservable().filter(function (i) {
                    return i.isLeader == true;
                }).first().subscribe(function (i) {
                    sub.unsubscribe();
                    res();
                });
            });
        })();
    }

    destroy() {
        var _this10 = this;

        return _asyncToGenerator(function* () {
            _this10.subs.map(function (sub) {
                return sub.unsubscribe();
            });
            _this10.unloads.map(function (fn) {
                return fn();
            });
            yield _this10.die();
            _this10.bc && _this10.bc.destroy();
        })();
    }
}

export let create = (() => {
    var _ref2 = _asyncToGenerator(function* (database) {
        const elector = new LeaderElector(database);
        yield elector.prepare();
        return elector;
    });

    return function create(_x) {
        return _ref2.apply(this, arguments);
    };
})();

export { documentID, SIGNAL_TIME };