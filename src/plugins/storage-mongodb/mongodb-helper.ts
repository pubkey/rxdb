import {
    MangoQuerySelector,
    MangoQuerySortPart,
    RxDocumentData
} from '../../types';
import {
    WithId,
    ObjectId,
    Sort as MongoSort
} from 'mongodb';
import { flatClone } from '../utils';
import { MongoQuerySelector } from './mongodb-types';
export const RX_STORAGE_NAME_MONGODB = 'mongodb';

export function primarySwapMongoDBQuerySelector<RxDocType>(
    primaryKey: keyof RxDocType,
    selector: MangoQuerySelector<RxDocType>
): MongoQuerySelector<RxDocType> {
    if (primaryKey === '_id') {
        return selector as any;
    }
    if (Array.isArray(selector)) {
        return selector.map(item => primarySwapMongoDBQuerySelector(primaryKey, item)) as any;
    } else if (typeof selector === 'object') {
        const ret: any = {};
        Object.entries(selector).forEach(([k, v]) => {
            if (k === primaryKey) {
                ret._id = v;
            } else {
                if (k.startsWith('$')) {
                    ret[k] = primarySwapMongoDBQuerySelector(primaryKey, v as any);
                } else {
                    ret[k] = v;
                }
            }
        });
        return ret;
    } else {
        return selector;
    }
}

export function swapMongoToRxDoc<RxDocType>(
    mongoObjectIdCache: WeakMap<RxDocumentData<RxDocType>, ObjectId>,
    docData: WithId<RxDocumentData<RxDocType>>
): RxDocumentData<RxDocType> {
    const objectId = docData._id;
    const useDoc = flatClone(docData) as RxDocumentData<RxDocType>;
    delete (useDoc as any)._id;
    mongoObjectIdCache.set(useDoc, objectId);
    return useDoc as any;
}
export function swapRxDocToMongo<RxDocType>(
    objectId: ObjectId,
    docData: RxDocumentData<RxDocType>
): WithId<RxDocumentData<RxDocType>> {
    const useDoc = flatClone(docData);
    (useDoc as any)._id = objectId;
    return useDoc as any;
}

export function swapToMongoSort<RxDocType>(
    primaryKey: keyof RxDocType,
    sort: MangoQuerySortPart<RxDocType>[]
): MongoSort {
    const ret = sort.map(sortPart => {
        const [key, direction] = Object.entries(sortPart)[0];
        const mongoKey = key === primaryKey ? '_id' : key;
        const mongoDirection = direction === 'asc' ? 1 : -1;
        return {
            [mongoKey]: mongoDirection
        };
    });
    return ret as any;
}

export function getMongoDBIndexName(index: string[]): string {
    return index.join('|');
}
