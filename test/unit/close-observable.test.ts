import assert from 'assert';
import config, { describeParallel } from './config.ts';

import {
    createRxDatabase,
    randomToken,
    RxCollection,
    RxDatabase
} from '../../plugins/core/index.mjs';
import {
    schemaObjects,
    schemas,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';

describeParallel('close-observable.test.ts', () => {
    type Collections = { humans: RxCollection<HumanDocumentType>; };

    async function createDbAndCollection(): Promise<{
        db: RxDatabase<Collections>;
        col: RxCollection<HumanDocumentType>;
    }> {
        const db = await createRxDatabase<Collections>({
            name: randomToken(10),
            storage: config.storage.getStorage(),
            ignoreDuplicate: true
        });
        await db.addCollections<Collections>({
            humans: { schema: schemas.human }
        });
        return { db, col: db.humans };
    }

    it('collection.$ should complete after collection.close()', async () => {
        const { db, col } = await createDbAndCollection();
        await col.insert(schemaObjects.humanData());

        let completed = false;
        const sub = col.$.subscribe({
            complete: () => {
                completed = true;
            }
        });

        await col.close();
        await new Promise(res => setTimeout(res, 50));

        assert.strictEqual(completed, true, 'collection.$ did not complete after close()');
        sub.unsubscribe();
        await db.close();
    });

    it('collection.insert$/update$/remove$ should complete after collection.close()', async () => {
        const { db, col } = await createDbAndCollection();

        const state = { insert: false, update: false, remove: false };
        const subs = [
            col.insert$.subscribe({
                complete: () => {
                    state.insert = true;
                }
            }),
            col.update$.subscribe({
                complete: () => {
                    state.update = true;
                }
            }),
            col.remove$.subscribe({
                complete: () => {
                    state.remove = true;
                }
            })
        ];

        await col.close();
        await new Promise(res => setTimeout(res, 50));

        assert.strictEqual(state.insert, true, 'insert$ did not complete');
        assert.strictEqual(state.update, true, 'update$ did not complete');
        assert.strictEqual(state.remove, true, 'remove$ did not complete');
        subs.forEach(s => s.unsubscribe());
        await db.close();
    });

    it('find().$ should complete after collection.close()', async () => {
        const { db, col } = await createDbAndCollection();
        await col.insert(schemaObjects.humanData());

        let completed = false;
        const query = col.find();
        const sub = query.$.subscribe({
            complete: () => {
                completed = true;
            }
        });

        await new Promise(res => setTimeout(res, 20));

        await col.close();
        await new Promise(res => setTimeout(res, 50));

        assert.strictEqual(completed, true, 'find().$ did not complete after close()');
        sub.unsubscribe();
        await db.close();
    });

    it('collection.$ should not emit events from a re-created collection with the same name', async () => {
        const db = await createRxDatabase<Collections>({
            name: randomToken(10),
            storage: config.storage.getStorage(),
            ignoreDuplicate: true
        });
        await db.addCollections<Collections>({
            humans: { schema: schemas.human }
        });
        const firstCol = db.humans;

        let emitCount = 0;
        const sub = firstCol.$.subscribe(() => {
            emitCount++;
        });

        await firstCol.close();

        await db.addCollections<Collections>({
            humans: { schema: schemas.human }
        });
        const secondCol = db.humans;
        await secondCol.insert(schemaObjects.humanData());
        await new Promise(res => setTimeout(res, 50));

        assert.strictEqual(emitCount, 0, 'old subscription received events from re-created collection');
        sub.unsubscribe();
        await db.close();
    });
});
