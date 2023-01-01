/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
import modifyjs from 'modifyjs';
import type {
    RxDocument,
    RxQuery,
    RxPlugin,
    UpdateQuery
} from '../../types';

export function incrementalUpdate<RxDocType>(
    this: RxDocument<RxDocType>,
    updateObj: UpdateQuery<RxDocType>
): Promise<RxDocument<RxDocType>> {
    return this.incrementalModify((docData) => {
        const newDocData = modifyjs(docData, updateObj);
        return newDocData;
    });
}

export function update<RxDocType>(
    this: RxDocument<RxDocType>,
    updateObj: UpdateQuery<RxDocType>
): Promise<RxDocument<RxDocType>> {
    const oldDocData = this._data;
    const newDocData = modifyjs(oldDocData, updateObj);
    return this._saveData(newDocData, oldDocData);
}

export function RxQueryUpdate(
    this: RxQuery,
    updateObj: UpdateQuery<any>
): Promise<any> {
    return this.exec()
        .then(docs => {
            if (!docs) {
                return null;
            }
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


export const RxDBUpdatePlugin: RxPlugin = {
    name: 'update',
    rxdb: true,
    prototypes: {
        RxDocument: (proto: any) => {
            proto.update = update;
            proto.incrementalUpdate = incrementalUpdate;
        },
        RxQuery: (proto: any) => {
            proto.update = RxQueryUpdate;
        }
    }
};
