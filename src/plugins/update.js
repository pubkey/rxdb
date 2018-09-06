/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
import modifyjs from 'modifyjs';
import {
    clone
} from '../util.js';

export function update(updateObj) {
    const oldDocData = clone(this._data);
    const newDocData = modifyjs(oldDocData, updateObj);

    return this._saveData(newDocData, oldDocData);
}

export async function RxQueryUpdate(updateObj) {
    const docs = await this.exec();
    if (!docs) return null;
    if (Array.isArray(docs)) {
        await Promise.all(
            docs.map(doc => doc.update(updateObj))
        );
    } else {
        // via findOne()
        await docs.update(updateObj);
    }
    return docs;
}


export const rxdb = true;
export const prototypes = {
    RxDocument: (proto) => {
        proto.update = update;
    },
    RxQuery: (proto) => {
        proto.update = RxQueryUpdate;
    }
};

export default {
    rxdb,
    prototypes
};
