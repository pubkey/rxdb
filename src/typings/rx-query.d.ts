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

export declare class RxQuery<RxDocumentType> {
    readonly collection: RxCollection<RxDocumentType>;

    where(queryObj: RxQueryObject<RxDocumentType> | keyof RxDocumentType): RxQuery<RxDocumentType>;
    equals(queryObj: any): RxQuery<RxDocumentType>;
    eq(queryObj: any): RxQuery<RxDocumentType>;
    or(queryObj: keyof RxDocumentType): RxQuery<RxDocumentType>;
    nor(queryObj: keyof RxDocumentType): RxQuery<RxDocumentType>;
    and(queryObj: keyof RxDocumentType): RxQuery<RxDocumentType>;
    gt(queryObj: any): RxQuery<RxDocumentType>;
    gte(queryObj: any): RxQuery<RxDocumentType>;
    lt(queryObj: any): RxQuery<RxDocumentType>;
    lte(queryObj: any): RxQuery<RxDocumentType>;
    ne(queryObj: any): RxQuery<RxDocumentType>;
    in(queryObj: any[]): RxQuery<RxDocumentType>;
    nin(queryObj: any[]): RxQuery<RxDocumentType>;
    all(queryObj: any): RxQuery<RxDocumentType>;
    regex(queryObj: RegExp): RxQuery<RxDocumentType>;
    exists(queryObj: any): RxQuery<RxDocumentType>;
    elemMatch(queryObj: any): RxQuery<RxDocumentType>;
    sort(params: any): RxQuery<RxDocumentType>;
    limit(amount: number): RxQuery<RxDocumentType>;
    skip(amount: number): RxQuery<RxDocumentType>;

    // TODO fix attribute-types of this function
    mod(p1: any, p2: any, p3: any): RxQuery<RxDocumentType>;

    exec(): Promise<RxDocumentType>;
    readonly $: Observable<RxDocumentType>;
    remove(): Promise<RxDocumentType>;
    update(updateObj: any): Promise<RxDocumentType>;
}
