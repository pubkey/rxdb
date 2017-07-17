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

    // ORM methods
    hpPercent(): number;
}

declare class RxHeroCollection extends RxDB.RxCollection<RxHeroDocument> {
}

export class RxHeroesDatabase extends RxDB.RxDatabase {
    hero?: RxHeroCollection;
}
