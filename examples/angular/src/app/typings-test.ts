/**
 * Verifies that Angular Signal typing works correctly with RxDB.
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

function checkDocumentDoubleDollar(doc: RxHeroDocument): Signal<RxHeroDocument> {
    return doc.$$;
}

function checkDocumentDeletedDoubleDollar(doc: RxHeroDocument): Signal<boolean> {
    return doc.deleted$$;
}

function checkDocumentFieldSignal(doc: RxHeroDocument): Signal<string> {
    return doc.name$$;
}

function checkDocumentHpSignal(doc: RxHeroDocument): Signal<number> {
    return doc.hp$$;
}

function checkQueryDoubleDollar(collection: RxHeroCollection): Signal<RxHeroDocument[]> {
    return collection.find().$$;
}

function checkFindOneDoubleDollar(collection: RxHeroCollection): Signal<RxHeroDocument | null> {
    return collection.findOne().$$;
}

function checkCountDoubleDollar(collection: RxHeroCollection): Signal<number> {
    return collection.count().$$;
}

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
