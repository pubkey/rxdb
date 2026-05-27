/**
 * custom typings so typescript knows about the schema-fields
 */

import type {
    RxDocument,
    RxCollection,
    RxDatabase
} from 'rxdb';
import type { AngularSignalReactivityLambda } from 'rxdb/plugins/reactivity-angular';
import { RxHeroDocumentType } from './schemas/hero.schema';

// ORM methods
type RxHeroDocMethods = {
    hpPercent(): number;
};

/**
 * Use AngularSignalReactivityLambda so that doc.$$ and doc.field$$ resolve to Signal<T>.
 */
export type RxHeroDocument = RxDocument<RxHeroDocumentType, RxHeroDocMethods, AngularSignalReactivityLambda>;

export type RxHeroCollection = RxCollection<RxHeroDocumentType, RxHeroDocMethods, unknown, unknown, AngularSignalReactivityLambda>;

export type RxHeroesCollections = {
    hero: RxHeroCollection;
};

export type RxHeroesDatabase = RxDatabase<
    RxHeroesCollections,
    unknown,
    unknown,
    AngularSignalReactivityLambda
>;
