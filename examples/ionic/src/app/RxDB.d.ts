import type {
    RxCollection,
    RxDatabase,
    RxDocument
} from 'rxdb';
import type { RxHeroDocumentType } from './schemas/hero.schema';

export type RxHeroDocument = RxDocument<RxHeroDocumentType>;

export type RxHeroCollection = RxCollection<RxHeroDocumentType>;

export type RxHeroesCollections = {
    hero: RxHeroCollection;
};

export type RxHeroesDatabase = RxDatabase<RxHeroesCollections>;
