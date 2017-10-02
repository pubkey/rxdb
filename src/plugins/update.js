/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
import modifyjs from 'modifyjs';
import deepEqual from 'deep-equal';

export function update(updateObj) {
    const newDoc = modifyjs(this._data, updateObj);

    Object.keys(this._data).forEach((previousPropName) => {
        if (newDoc[previousPropName]) {
            // if we don't check inequality, it triggers an update attempt on fields that didn't really change,
            // which causes problems with "readonly" fields
            if (!deepEqual(this._data[previousPropName], newDoc[previousPropName]))
                this._data[previousPropName] = newDoc[previousPropName];
        } else
            delete this._data[previousPropName];
    });
    delete newDoc._rev;
    delete newDoc._id;
    Object.keys(newDoc)
        .filter(newPropName => !deepEqual(this._data[newPropName], newDoc[newPropName]))
        .forEach(newPropName => this._data[newPropName] = newDoc[newPropName]);

    return this.save();
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
