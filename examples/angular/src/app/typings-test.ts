/**
 * This file verifies that Angular Signal typing works correctly with RxDB
 * when using AngularSignalReactivityLambda.
 *
 * It is compiled as part of the Angular build to catch any regressions in
 * the published type declarations (dist/types/**/*.d.ts).
 *
 * @link https://github.com/pubkey/rxdb/issues/8488
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Signal } from '@angular/core';
import type { RxDocument } from 'rxdb';
import type { AngularSignalReactivityLambda } from 'rxdb/plugins/reactivity-angular';
import type {
    RxHeroDocument,
    RxHeroesDatabase,
    RxHeroCollection
} from './RxDB.d';
import type { RxHeroDocumentType } from './schemas/hero.schema';

/**
 * Verify that doc.$$ resolves to Signal<RxDocument<...>> (not Signal<unknown>).
 */
function checkDocumentDoubleDollar(doc: RxHeroDocument): Signal<RxHeroDocument> {
    // doc.$$ must be Signal<RxDocument<RxHeroDocumentType, RxHeroDocMethods, AngularSignalReactivityLambda>>
    return doc.$$;
}

/**
 * Verify that doc.deleted$$ resolves to Signal<boolean> (not Signal<unknown>).
 */
function checkDocumentDeletedDoubleDollar(doc: RxHeroDocument): Signal<boolean> {
    return doc.deleted$$;
}

/**
 * Verify that doc.name$$ resolves to Signal<string> (not Signal<unknown>).
 * This is the core of issue #8488: field$$ must carry the field's type.
 */
function checkDocumentFieldSignal(doc: RxHeroDocument): Signal<string> {
    return doc.name$$;
}

/**
 * Verify that doc.hp$$ resolves to Signal<number> (not Signal<unknown>).
 */
function checkDocumentHpSignal(doc: RxHeroDocument): Signal<number> {
    return doc.hp$$;
}

/**
 * Verify that collection.find().$$ resolves to Signal<RxHeroDocument[]>.
 */
function checkQueryDoubleDollar(collection: RxHeroCollection): Signal<RxHeroDocument[]> {
    return collection.find().$$;
}

/**
 * Verify that collection.findOne().$$ resolves to Signal<RxHeroDocument | null>.
 */
function checkFindOneDoubleDollar(collection: RxHeroCollection): Signal<RxHeroDocument | null> {
    return collection.findOne().$$;
}

/**
 * Verify that collection.count().$$ resolves to Signal<number>.
 */
function checkCountDoubleDollar(collection: RxHeroCollection): Signal<number> {
    return collection.count().$$;
}

/**
 * Verify the types via the database accessor to simulate real usage.
 */
async function checkViaDatabase(db: RxHeroesDatabase) {
    const heroCountSignal: Signal<number> = db.hero.count().$$;
    const heroesSignal: Signal<RxHeroDocument[]> = db.hero.find().$$;
    const firstHeroSignal: Signal<RxHeroDocument | null> = db.hero.findOne().$$;

    const doc = await db.hero.findOne().exec();
    if (doc) {
        const nameSignal: Signal<string> = doc.name$$;
        const hpSignal: Signal<number> = doc.hp$$;
        const deletedSignal: Signal<boolean> = doc.deleted$$;
        const docSignal: Signal<RxDocument<RxHeroDocumentType, any, AngularSignalReactivityLambda>> = doc.$$;
    }
}
