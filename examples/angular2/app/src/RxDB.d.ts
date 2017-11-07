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

    // ORM methods
    hpPercent(): number;
}

export type RxHeroDocument = RxDocument<RxHeroDocumentType>;

declare class RxHeroCollection extends RxCollection<RxHeroDocumentType> {
}

export class RxHeroesDatabase extends RxDatabase {
    hero?: RxHeroCollection;
}

declare let _default: {
    RxHeroCollection,
    RxHeroesDatabase
};
export default _default;
