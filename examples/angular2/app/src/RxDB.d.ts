/**
 * custom typings so typescript knows about the schema-fields
 * @type {[type]}
 */

import * as RxDB from 'rxdb';
import { Observable } from 'rxjs';

declare interface RxHeroDocumentData {
    name?: string;
    color?: string;
    maxHP?: number;
    hp?: number;
    team?: string;
    skills?: Array<{
        name?: string,
        damage?: string
    }>;
}

declare class RxHeroDocument extends RxDB.RxDocument {
    name: string;
    color: string;
    maxHP: number;
    hp?: number;
    team?: string;
    skills?: Array<{
        name?: string,
        damage?: string
    }>;
}

declare class RxHeroQuery extends RxDB.RxQuery {
    $: Observable<RxHeroDocument[] | RxHeroDocument>;
    exec(): Promise<RxHeroDocument[] | RxHeroDocument>;

    where(queryObj: any): RxHeroQuery;
    equals(queryObj: any): RxHeroQuery;
    eq(queryObj: any): RxHeroQuery;
    or(queryObj: any): RxHeroQuery;
    nor(queryObj: any): RxHeroQuery;
    and(queryObj: any): RxHeroQuery;
    gt(queryObj: any): RxHeroQuery;
    gte(queryObj: any): RxHeroQuery;
    lt(queryObj: any): RxHeroQuery;
    lte(queryObj: any): RxHeroQuery;
    ne(queryObj: any): RxHeroQuery;
    in(queryObj: any): RxHeroQuery;
    nin(queryObj: any): RxHeroQuery;
    all(queryObj: any): RxHeroQuery;
    regex(queryObj: any): RxHeroQuery;
    exists(queryObj: any): RxHeroQuery;
    elemMatch(queryObj: any): RxHeroQuery;
    sort(params: any): RxHeroQuery;
    limit(amount: number): RxHeroQuery;
    skip(amount: number): RxHeroQuery;
}

declare class RxHeroCollection extends RxDB.RxCollection {
    find(queryObj?: any): RxHeroQuery;
    newDocument(json: RxHeroDocumentData): RxHeroDocument;

}

export class RxHeroesDatabase extends RxDB.RxDatabase {
    hero: RxHeroCollection;
}
