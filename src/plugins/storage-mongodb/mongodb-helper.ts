import { MangoQuerySelector, MangoQuerySortPart, RxDocumentData } from '../../types';
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

export function swapPrimaryToMongo<RxDocType>(
    primaryKey: keyof RxDocType,
    document: RxDocumentData<RxDocType>
): WithId<RxDocumentData<RxDocType>> {
    const docData = flatClone(document) as any;
    const id: string = document[primaryKey] as string;
    delete docData[primaryKey];
    docData._id = new ObjectId(id);
    return docData;
}

export function swapMongoToPrimary<RxDocType>(
    primaryKey: keyof RxDocType,
    document: WithId<RxDocumentData<RxDocType>>
): WithId<RxDocumentData<RxDocType>> {
    const id: string = document._id.toString();
    const docData = flatClone(document) as any;
    delete docData._id;
    docData[primaryKey] = id;
    return docData;
}
