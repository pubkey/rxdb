/**
 * custom typings so typescript knows about the schema-fields
 * @type {[type]}
 */

import { RxDocument, RxCollection, RxDatabase } from 'rxdb';
import { Observable } from 'rxjs';

export type RxHeroDocumentType = {
    name: string;
    color: string;
    maxHP: number;
    hp: number;
    team?: string;
    skills: Array<{
        name?: string,
        damage?: string
    }>;
};

// ORM methods
type RxHeroDocMethods = {
    hpPercent(): number;
};

export type RxHeroDocument = RxDocument<RxHeroDocumentType, RxHeroDocMethods>;

export type RxHeroCollection = RxCollection<RxHeroDocumentType, RxHeroDocMethods, {}>;

export type RxHeroesCollections = {
    hero: RxHeroCollection;
};

export type RxHeroesDatabase = RxDatabase<RxHeroesCollections>;
