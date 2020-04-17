/**
 * custom typings so typescript knows about the schema-fields
 */

import { RxDocument, RxCollection, RxDatabase } from 'rxdb';

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
