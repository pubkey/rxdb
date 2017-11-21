import { Observable } from 'rxjs';
import {
    RxCollection
} from './rx-collection';

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

export type RxQueryObject<T> = keyof T & { [P in keyof T]?: T[P] | RxQueryOptions<T[P]>; } & {
    $or: RxQueryObject<T>[];
    $nor: RxQueryObject<T>[];
    $and: RxQueryObject<T>[];
};

export declare class RxQuery<RxDocumentType, RxQueryResult> {
    readonly collection: RxCollection<RxDocumentType>;

    where(queryObj: RxQueryObject<RxDocumentType> | keyof RxDocumentType | string): RxQuery<RxDocumentType, RxQueryResult>;
    equals(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    eq(queryObj: any): RxQuery<RxDocumentType, RxQueryResult>;
    or(queryObj: keyof RxDocumentType | string): RxQuery<RxDocumentType, RxQueryResult>;
    nor(queryObj: keyof RxDocumentType | string): RxQuery<RxDocumentType, RxQueryResult>;
    and(queryObj: keyof RxDocumentType | string): RxQuery<RxDocumentType, RxQueryResult>;
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
    sort(params: any): RxQuery<RxDocumentType, RxQueryResult>;
    limit(amount: number): RxQuery<RxDocumentType, RxQueryResult>;
    skip(amount: number): RxQuery<RxDocumentType, RxQueryResult>;

    // TODO fix attribute-types of this function
    mod(p1: any, p2: any, p3: any): RxQuery<RxDocumentType, RxQueryResult>;

    exec(): Promise<RxQueryResult>;
    readonly $: Observable<RxQueryResult>;
    remove(): Promise<RxQueryResult>;
    update(updateObj: any): Promise<RxQueryResult>;
}
