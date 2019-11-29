/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
import modifyjs from 'modifyjs';
import {
    clone
} from '../util.js';
import {
    RxDocument,
    RxQuery
} from '../types';

export function update(this: RxDocument, updateObj: any) {
    const oldDocData = this._data;
    const newDocData = modifyjs(oldDocData, updateObj);

    return this._saveData(newDocData, oldDocData);
}

export function RxQueryUpdate(
    this: RxQuery,
    updateObj: any
    ): Promise<any> {
    return this.exec()
        .then(docs => {
            if (!docs) return null;
            if (Array.isArray(docs)) {
                return Promise.all(
                    docs.map(doc => doc.update(updateObj))
                ).then(() => docs);
            } else {
                // via findOne()
                return docs.update(updateObj).then(() => docs);
            }
        });
}


export const rxdb = true;
export const prototypes = {
    RxDocument: (proto: any) => {
        proto.update = update;
    },
    RxQuery: (proto: any) => {
        proto.update = RxQueryUpdate;
    }
};

export default {
    rxdb,
    prototypes
};
