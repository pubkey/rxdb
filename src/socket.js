import * as util from './util';
import RxChangeEvent from './rx-change-event';
import RxBroadcastChannel from './rx-broadcast-channel';

const TIMESTAMP_DOC_ID = '_local/last-change';
const EVENT_TTL = 5000; // after this age, events will be deleted
const PULL_TIME = RxBroadcastChannel.canIUse() ? EVENT_TTL / 2 : 200;

import {
    Subject
} from 'rxjs/Subject';
import {
    filter
} from 'rxjs/operators/filter';

class Socket {
    constructor(database) {
        this._destroyed = false;
        this.database = database;
        this.token = database.token;
        this.subs = [];

        this.pullCount = 0;
        this.pull_running = false;
        this.lastPull = new Date().getTime();
        this.lastTimestamp = 0;
        this.receivedEvents = {};

        this.bc = RxBroadcastChannel.create(this.database, 'socket');
        this.messages$ = new Subject();
    }

    /**
     * @return {Observable}
     */
    get $() {
        if (!this._$)
            this._$ = this.messages$.asObservable();
        return this._$;
    }

    async prepare() {
        // create socket-collection
        this.pouch = this.database._spawnPouchDB('_socket', 0, {
            auto_compaction: false, // this is false because its done manually at .pull()
            revs_limit: 1
        });

        // pull on BroadcastChannel-message
        if (this.bc) {
            this.subs.push(
                this.bc.$
                .pipe(
                    filter(msg => msg.type === 'pull')
                )
                .subscribe(() => this.pull())
            );
        }

        // pull on intervall
        (async () => {
            while (!this._destroyed) {
                await util.promiseWait(PULL_TIME);
                if (this.messages$.observers.length > 0 && !this._destroyed)
                    await this.pull();
            }
        })();

        return this;
    }


    /**
     * write the given event to the socket
     */
    async write(changeEvent) {
        const socketDoc = changeEvent.toJSON();
        delete socketDoc.db;

        // TODO find a way to getAll on local documents
        //  socketDoc._id = '_local/' + util.fastUnsecureHash(socketDoc);
        socketDoc._id = '' + util.fastUnsecureHash(socketDoc) + socketDoc.t;
        await this.database.lockedRun(
            () => this.pouch.put(socketDoc)
        );
        await this._updateLastTimestamp();
        this.bc && await this.bc.write('pull');
        return true;
    }

    async _getLastTimeDoc() {
        try {
            const lastTimestampDoc = await this.database.lockedRun(
                () => this.pouch.get(TIMESTAMP_DOC_ID)
            );
            return lastTimestampDoc;
        } catch (err) {
            return null;
        }
    }

    async _updateLastTimestamp() {
        const run = async () => {
            const newTime = new Date().getTime();
            const doc = await this._getLastTimeDoc();
            if (!doc) {
                return this.database.lockedRun(
                    () => this.pouch.put({
                        _id: TIMESTAMP_DOC_ID,
                        time: newTime
                    })
                );
            } else {
                doc.time = newTime;
                return this.database.lockedRun(
                    () => this.pouch.put(doc)
                );
            }
        };

        // run until sucess
        let done = false;
        while (!done) {
            try {
                await run();
                done = true;
            } catch (e) {}
        }
    }

    /**
     * get all docs from the socket-collection
     */
    async fetchDocs() {
        /**
         *
         * TODO we can optimize this by only doing a fetch when the seq-number has changed
         * but this currently does not work on leveldown-apdaters
         * @link https://github.com/pouchdb/pouchdb/pull/6924
         */
        // const lastSeq = new Promise(res => pouch._info((err, i) => res(i.update_seq)));
        // if (lastSeq <= this._lastSeq) return [];

        const lastTimeDoc = await this._getLastTimeDoc();
        const lastTime = lastTimeDoc ? lastTimeDoc.time : 0;
        if (this.lastTimestamp >= lastTime) {
            // nothing has changed, return nothing
            return [];
        } else {
            this.lastTimestamp = lastTime;
            const result = await this.database.lockedRun(
                () => this.pouch.allDocs({
                    include_docs: true
                })
            );
            return result.rows
                .map(row => row.doc);
        }
    }


    /**
     * delete the document from the socket-database.
     * This mutes errors because they are likely but not bad on multiInstance
     * @param  {any} doc
     * @return {Promise<boolean>} success
     */
    async deleteDoc(doc) {
        let success = true;
        try {
            await this.database.lockedRun(
                () => this.pouch.remove(doc)
            );
        } catch (err) {
            success = false;
        }
        return success;
    }

    /**
     * runs a cleanup to delete the given docs
     * @param  {array} docsData docs to be deleted
     * @return {void}
     */
    _cleanupDocs(docsData) {
        // delete docs on idle
        docsData.forEach(docData => {
            this.database.requestIdlePromise().then(() => {
                if (this._destroyed)
                    return;
                this.deleteDoc(docData);
            });
        });

        // run a compaction if more than one doc was deleted
        if (docsData.length > 0) {
            this.database.requestIdlePromise().then(() => {
                if (this._destroyed) return;
                this.database.lockedRun(
                    () => this.pouch.compact()
                );
            });
        }
    }

    /**
     * grab all new events from the socket-pouchdb
     * and throw them into this.messages$
     */
    async pull() {
        if (this.isPulling) {
            this._repullAfter = true;
            return false;
        }
        this.isPulling = true;
        this.pullCount++;

        // w8 for idle-time because this is a non-prio-task
        await util.requestIdlePromise(EVENT_TTL / 2);
        if (this._destroyed) return;

        const minTime = this.lastPull - 100; // TODO evaluate this value (100)
        this.lastPull = new Date().getTime();
        const docs = await this.fetchDocs();
        if (this._destroyed) return;
        docs
            .filter(doc => doc.it !== this.token) // do not get events emitted by self
            // do not get events older than minTime
            .filter(doc => doc.t > minTime)
            // sort timestamp
            .sort((a, b) => {
                if (a.t > b.t) return 1;
                return -1;
            })
            .map(doc => RxChangeEvent.fromJSON(doc))
            // make sure the same event is not emitted twice
            .filter(cE => {
                if (this.receivedEvents[cE.hash]) return false;
                return this.receivedEvents[cE.hash] = new Date().getTime();
            })
            // prevent memory leak of this.receivedEvents
            .filter(cE => setTimeout(() => delete this.receivedEvents[cE.hash], EVENT_TTL * 3))
            // emit to messages
            .forEach(cE => this.messages$.next(cE));

        if (this._destroyed) return;

        // delete old documents
        const maxAge = new Date().getTime() - EVENT_TTL;
        const delDocs = docs.filter(doc => doc.t < maxAge);
        this._cleanupDocs(delDocs);

        this.isPulling = false;
        if (this._repull) {
            this._repull = false;
            this.pull();
        }
        return true;
    }

    async destroy() {
        this._destroyed = true;
        this.subs.map(sub => sub.unsubscribe());
        this.bc && this.bc.destroy();
    }
}

/**
 * creates a socket
 * @return {Promise<Socket>}
 */
export function create(database) {
    const socket = new Socket(database);
    return socket.prepare();
}

export {
    EVENT_TTL as EVENT_TTL,
    PULL_TIME as PULL_TIME
};

export default {
    create,
    EVENT_TTL,
    PULL_TIME
};
