/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */

import {
    hash
} from './util';

import {
    RxDatabase,
    RxCollection
} from './types';

export class RxChangeEvent {
    constructor(
        public data: any
    ) { }
    get hash() {
        if (!this._hash)
            this._hash = hash(this.data);
        return this._hash;
    }

    private _hash: string | null = null;
    toJSON() {
        const ret = {
            col: null,
            doc: null,
            v: null,
            op: this.data.op,
            t: this.data.t,
            db: this.data.db,
            it: this.data.it,
            isLocal: this.data.isLocal
        };
        if (this.data.col) ret.col = this.data.col;
        if (this.data.doc) ret.doc = this.data.doc;
        if (this.data.v) ret.v = this.data.v;
        return ret;
    }

    isIntern() {
        if (this.data.col && this.data.col.charAt(0) === '_')
            return true;
        return false;
    }

    isSocket() {
        if (this.data.col && this.data.col === '_socket')
            return true;
        return false;
    }
}


export function changeEventfromJSON(data: any) {
    return new RxChangeEvent(data);
}

export function changeEventfromPouchChange(changeDoc: any, collection: RxCollection) {
    let op = changeDoc._rev.startsWith('1-') ? 'INSERT' : 'UPDATE';
    if (changeDoc._deleted) op = 'REMOVE';

    // decompress / primarySwap
    changeDoc = collection._handleFromPouch(changeDoc);

    const data = {
        op,
        t: new Date().getTime(),
        db: 'remote',
        col: collection.name,
        it: collection.database.token,
        doc: changeDoc[collection.schema.primaryPath],
        v: changeDoc
    };
    return new RxChangeEvent(data);
}

export function createChangeEvent(
    op: string,
    database: RxDatabase,
    collection?: RxCollection,
    doc?: any,
    value?: any,
    isLocal = false
) {
    const data = {
        col: collection ? collection.name : null,
        doc: doc ? doc.primary : null,
        v: value ? value : null,
        op: op,
        t: new Date().getTime(),
        db: database.name,
        it: database.token,
        isLocal
    };
    return new RxChangeEvent(data);
}


export function isInstanceOf(obj: any) {
    return obj instanceof RxChangeEvent;
}
