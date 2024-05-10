/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using mingo internally
 * @link https://github.com/kofrasa/mingo
 */
import { runQueryUpdateFunction } from '../../rx-query-helper.ts';
import type {
    RxDocument,
    RxQuery,
    RxPlugin,
    UpdateQuery
} from '../../types/index.d.ts';
import { mingoUpdater } from './mingo-updater.ts';

export function incrementalUpdate<RxDocType>(
    this: RxDocument<RxDocType>,
    updateObj: UpdateQuery<RxDocType>
): Promise<RxDocument<RxDocType>> {
    return this.incrementalModify((docData) => {
        const newDocData = mingoUpdater<RxDocType>(docData, updateObj);
        return newDocData;
    });
}

export function update<RxDocType>(
    this: RxDocument<RxDocType>,
    updateObj: UpdateQuery<RxDocType>
): Promise<RxDocument<RxDocType>> {
    const oldDocData = this._data;
    const newDocData = mingoUpdater(oldDocData, updateObj);
    return this._saveData(newDocData, oldDocData);
}

export async function RxQueryUpdate(
    this: RxQuery,
    updateObj: UpdateQuery<any>
): Promise<any> {
    return runQueryUpdateFunction(
        this.asRxQuery,
        (doc) => doc.update(updateObj),
    );
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
