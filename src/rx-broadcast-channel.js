import {
    fromEvent
} from 'rxjs/observable/fromEvent';
import {
    map
} from 'rxjs/operators/map';
import {
    filter
} from 'rxjs/operators/filter';

/**
 * this is a wrapper for BroadcastChannel to integrate it with RxJS
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
 */
class RxBroadcastChannel {
    constructor(database, name) {
        this.name = name;
        this.database = database;
        this.token = database.token;
    }

    /**
     * @return {BroadcastChannel}
     */
    get bc() {
        if (!this._bc) {
            this._bc = new BroadcastChannel(
                'RxDB:' +
                this.database.name + ':' +
                this.name
            );
        }
        return this._bc;
    }

    /**
     * @return {Observable}
     */
    get $() {
        if (!this._$) {
            this._$ = fromEvent(this.bc, 'message')
                .pipe(
                    map(msg => msg.data),
                    map(strMsg => JSON.parse(strMsg)),
                    filter(msg => msg.it !== this.token)
                );
        }
        return this._$;
    }

    /**
     * write data to the channel
     * @param {string} type
     * @param {Object} data
     * @return {Promise<any>}
     */
    write(type, data) {
        return this.bc.postMessage(
            JSON.stringify({
                type,
                it: this.token,
                data,
                t: new Date().getTime()
            })
        );
    }

    destroy() {
        this._bc && this._bc.close();
    }
}

/**
 * Detect if client can use BroadcastChannel
 * @return {Boolean}
 */
let _canIUse = null;
export function canIUse() {
    if (_canIUse === null) {
        if (
            typeof window === 'object' &&
            window.BroadcastChannel &&
            typeof window.BroadcastChannel === 'function' &&
            typeof window.BroadcastChannel.prototype.postMessage === 'function' &&
            typeof window.BroadcastChannel.prototype.close === 'function'
        ) _canIUse = true;
        else _canIUse = false;
    }
    return _canIUse;
}

/**
 * returns null if no bc available
 * @return {BroadcastChannel} bc which is observable
 */
export function create(database, name) {
    if (!canIUse()) return null;
    return new RxBroadcastChannel(database, name);
}

export default {
    create,
    canIUse
};
