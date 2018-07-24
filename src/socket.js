import {
    Subject
} from 'rxjs';

import RxChangeEvent from './rx-change-event';
import BroadcastChannel from 'broadcast-channel';

class Socket {
    constructor(database) {
        this._destroyed = false;
        this.database = database;
        this.token = database.token;

        this.bc = new BroadcastChannel(
            'RxDB:' +
            this.database.name + ':' +
            'socket'
        );
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

    prepare() {
        this.bc.onmessage = msg => {
            if (msg.st !== this.database.storageToken) return; // not same storage-state
            if (msg.db === this.database.token) return; // same db
            const changeEvent = RxChangeEvent.fromJSON(msg.d);
            this.messages$.next(changeEvent);
        };

        return this;
    }


    /**
     * write the given event to the socket
     */
    write(changeEvent) {
        const socketDoc = changeEvent.toJSON();

        delete socketDoc.db;
        const sendOverChannel = {
            db: this.token, // database-token
            st: this.database.storageToken, // storage-token
            d: socketDoc
        };

        return this.bc.postMessage(sendOverChannel);
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        setTimeout(() => this.bc.close(), 100);
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

export default {
    create,
};
