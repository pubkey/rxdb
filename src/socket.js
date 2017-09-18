import * as util from './util';
import RxChangeEvent from './rx-change-event';
import RxBroadcastChannel from './rx-broadcast-channel';

const EVENT_TTL = 5000; // after this age, events will be deleted
const PULL_TIME = RxBroadcastChannel.canIUse() ? EVENT_TTL / 2 : 200;

class Socket {

    constructor(database) {
        this._destroyed = false;
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
                .filter(msg => msg.type == 'pull')
                .subscribe(() => this.pull())
            );
        }

        // pull on intervall
        (async() => {
            while (!this._destroyed) {
                await util.promiseWait(PULL_TIME);
                if (this.messages$.observers.length > 0)
                    await this.pull();
            }
        })();

        return this;
    }


    /**
     * write the given event to the socket
     */
    async write(changeEvent) {
        // w8 for idle-time because this is a non-prio-task
        await util.requestIdlePromise();

        const socketDoc = changeEvent.toJSON();
        delete socketDoc.db;

        // TODO find a way to getAll on local documents
        //  socketDoc._id = '_local/' + util.fastUnsecureHash(socketDoc);
        socketDoc._id = '' + util.fastUnsecureHash(socketDoc) + socketDoc.t;
        await this.database.lockedRun(
            () => this.pouch.put(socketDoc)
        );
        this.bc && await this.bc.write('pull');
        return true;
    }


    /**
     * get all docs from the socket-collection
     */
    async fetchDocs() {
        const result = await this.database.lockedRun(
            () => this.pouch.allDocs({
                include_docs: true
            })
        );
        return result.rows
            .map(row => row.doc);
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
        const docs = await this.fetchDocs();
        if (this._destroyed) return;
        docs
            .filter(doc => doc.it != this.token) // do not get events emitted by self
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
                if (this.recievedEvents[cE.hash]) return false;
                return this.recievedEvents[cE.hash] = new Date().getTime();
            })
            // prevent memory leak of this.recievedEvents
            .filter(cE => setTimeout(() => delete this.recievedEvents[cE.hash], EVENT_TTL * 3))
            // emit to messages
            .forEach(cE => this.messages$.next(cE));

        if (this._destroyed) return;

        // delete old documents
        const maxAge = new Date().getTime() - EVENT_TTL;
        const delDocs = docs.filter(doc => doc.t < maxAge);
        this._cleanupDocs(delDocs);

        this.lastPull = new Date().getTime();
        this.isPulling = false;
        if (this._repull) {
            this._repull = false;
            this.pull();
        }
        return true;
    }

    destroy() {
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
