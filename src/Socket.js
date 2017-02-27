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
                .subscribe(msg => this.pull())
            );
        }

        // pull on intervall
        const autoPull = util.Rx.Observable
            .interval(PULL_TIME)
            .filter(c => this.messages$.observers.length > 0)
            .subscribe(x => this.pull());
        this.subs.push(autoPull);

        return;
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
        await this.pouch.put(socketDoc);
        this.bc && await this.bc.write('pull');
        return true;
    }


    /**
     * get all docs from the socket-collection
     */
    async fetchDocs() {
        const result = await this.pouch.allDocs({
            include_docs: true
        });
        return result.rows
            .map(row => row.doc);
    }
    async deleteDoc(doc) {
        try {
            await this.pouch.remove(doc);
        } catch (e) {}
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

        const minTime = this.lastPull - 100; // TODO evaluate this value (100)
        const docs = await this.fetchDocs();
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


        // delete old documents
        const maxAge = new Date().getTime() - EVENT_TTL;
        const delDocs = docs
            .filter(doc => doc.t < maxAge)
            .map(doc => this.deleteDoc(doc));
        if (delDocs.length > 0)
            await this.pouch.compact();


        this.lastPull = new Date().getTime();
        this.isPulling = false;
        if (this._repull) {
            this._repull = false;
            this.pull();
        }
        return true;
    }



    destroy() {
        this.subs.map(sub => sub.unsubscribe());
        if (this.bc) this.bc.destroy();
    }

}


export async function create(database) {
    const socket = new Socket(database);
    await socket.prepare();
    return socket;
}

export {
    EVENT_TTL as EVENT_TTL,
    PULL_TIME as PULL_TIME
};
