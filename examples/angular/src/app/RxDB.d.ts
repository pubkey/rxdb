/**
 * custom typings so typescript knows about the schema-fields
 */

import type {
    RxDocument,
    RxCollection,
    RxDatabase
} from 'rxdb';
import { RxHeroDocumentType } from './schemas/hero.schema';

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
