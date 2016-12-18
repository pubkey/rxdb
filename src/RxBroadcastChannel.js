import * as util from './util';

/**
 * this is a wrapper for BroadcastChannel to integrate it with RxJS
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
 */
class RxBroadcastChannel {
    constructor(database, name) {
        this.name = name;
        this.database = database;
        this.token = database.token;

        this.bc = new BroadcastChannel(
            'RxDB:' +
            this.database.prefix + ':' +
            this.name
        );

        this.$ = util.Rx.Observable
            .fromEvent(this.bc, 'message')
            .map(msg => msg.data)
            .map(strMsg => JSON.parse(strMsg))
            .filter(msg => msg.it != this.token);

    }

    /**
     * write data to the channel
     * @param {string} type
     * @param {Object} data
     */
    async write(type, data) {
        await this.bc.postMessage(JSON.stringify({
            type,
            it: this.token,
            data
        }));
    }

    destroy() {
        this.bc.close();
    }
}

/**
 * Detect if client can use BroadcastChannel
 * @return {Boolean}
 */
export function canIUse() {
    if (
        typeof window === 'object' &&
        window.BroadcastChannel &&
        typeof window.BroadcastChannel === 'function' &&
        typeof window.BroadcastChannel.prototype.postMessage === 'function' &&
        typeof window.BroadcastChannel.prototype.close === 'function'
    ) return true;
    return false;
}


/**
 * returns null if no bc available
 * @return {BroadcastChannel} bc which is observable
 */
export function create(database, name) {
    if (!canIUse()) return null;

    return new RxBroadcastChannel(database, name);
}
