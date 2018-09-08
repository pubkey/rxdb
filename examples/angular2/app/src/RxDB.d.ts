/**
 * custom typings so typescript knows about the schema-fields
 * @type {[type]}
 */

import { RxDocument, RxCollection, RxDatabase } from 'rxdb';
import { Observable } from 'rxjs';

declare interface RxHeroDocumentType {
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

// ORM methods
type RxHeroOrmMethods = {
    hpPercent(): number;
};

export type RxHeroDocument = RxDocument<RxHeroDocumentType, RxHeroOrmMethods>;

declare class RxHeroCollection extends RxCollection<RxHeroDocumentType, RxHeroOrmMethods> {
    pouch: any;
}

export type RxHeroesCollections = {
    hero: RxHeroCollection;
};

export type RxHeroesDatabase = RxDatabase<RxHeroesCollections>;

declare let _default: {
    RxHeroCollection,
    RxHeroesDatabase
};
export default _default;
