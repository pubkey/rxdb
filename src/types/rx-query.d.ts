import {
    RxQueryBase
} from '../rx-query';
import { StringKeys } from './util';

export interface RxQueryOptions<T> {
    $eq?: T;
    $gt?: T;
    $gte?: T;
    $lt?: T;
    $lte?: T;
    $ne?: T;
    $in?: T[];
    $nin?: T[];
    $regex?: RegExp;
    $exists?: boolean;
    $type?: 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object';
    $mod?: number;
    $not?: T;
    $all?: T[];
    $size?: number;
    $elemMatch?: RxQueryOptions<T>;
}

export type RxQueryObject<T = any> = keyof T & { [P in keyof T]?: T[P] | RxQueryOptions<T[P]>; } & {
    $or: RxQueryObject<T>[];
    $nor: RxQueryObject<T>[];
    $and: RxQueryObject<T>[];
};

// TODO this should be typed
export type MangoQuerySelector<RxDocType = any> = {
    [k: string]: MangoQuerySelector<RxDocType> | any;
};

/**
 * Discussion was at:
 * @link https://github.com/pubkey/rxdb/issues/1972
 */
export type MangoQuerySortDirection = 'asc' | 'desc';
export type MangoQuerySortPart<RxDocType = any> = {
    [k in StringKeys<RxDocType> | string]: MangoQuerySortDirection;
};

export type MangoQueryNoLimit<RxDocType = any> = {
    /**
     * Selector is optional,
     * if not given, the query matches all documents
     * that are not _deleted=true.
     */
    selector?: MangoQuerySelector<RxDocType>;
    skip?: number;
    /**
     * Sorting of the results.
     * If no sort is set, RxDB will sort by the primary key.
     * Also if sort is set, RxDB will add primaryKey sorting
     * if the primaryKey was not in the sort parameters before.
     * This ensures that there is a deterministic sorting of the 
     * results, not mather at which order the documents have been
     * inserted into the storage.
     */
    sort?: MangoQuerySortPart<RxDocType>[];
    /**
     * By default, the RxStorage implementation
     * decides which index to use when running the query.
     * 
     * For better performance, a different index might be defined
     * by setting it in the query.
     * How this improves performance and if the defined index is used,
     * depends on the RxStorage implementation.
     */
    index?: string | string[];
};

export type MangoQuery<RxDocType = any> = MangoQueryNoLimit<RxDocType> & {
    limit?: number;
};

export type RxQueryOP = 'find' | 'findOne';

export declare class RxQuery<RxDocumentType = any, RxQueryResult = RxDocumentType | RxDocumentType[]> extends RxQueryBase<RxDocumentType, RxQueryResult> {
    equals(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    eq(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    or(queryObj: keyof RxDocumentType | string | any[]): RxQuery<RxDocumentType, RxQueryResult>;
    nor(queryObj: keyof RxDocumentType | string | any[]): RxQuery<RxDocumentType, RxQueryResult>;
    and(queryObj: keyof RxDocumentType | string | any[]): RxQuery<RxDocumentType, RxQueryResult>;
    gt(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    gte(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    lt(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    lte(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    ne(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    in(queryObj: any[]): RxQuery<RxDocumentType, RxQueryResult>;
    nin(queryObj: any[]): RxQuery<RxDocumentType, RxQueryResult>;
    all(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    regex(queryObj: RegExp): RxQuery<RxDocumentType, RxQueryResult>;
    exists(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    elemMatch(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    mod(p1: any, p2: any, p3: any): RxQuery<RxDocumentType, RxQueryResult>;
}
