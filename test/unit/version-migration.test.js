import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import RxDB from '../../';

config.parallel('version-migration.test.js', () => {
    /**
     * in rxdb 8.0.0
     * we renamed the option to 'keyCompression'
     * This tests ensures that migrations still work when the internal schema
     * uses the old option
     */
    it('should be able to migrate documents when old schema has disable-key-compression', async () => {
        const name = util.randomCouchString(10);
        const db = await RxDB.create({
            name,
            adapter: 'memory'
        });
        const collection = await db.collection({
            name,
            schema: schemas.human
        });
        await collection.insert(schemaObjects.human());

        // change internal schema to old config
        const colPouch = db._collectionsPouch;
        const colDocs = await colPouch.allDocs({
            include_docs: true
        });
        const colDoc = colDocs.rows[0].doc;
        delete colDoc.schema.keyCompression;
        colDoc.schema.disableKeyCompression = false;
        await colPouch.put(colDoc);
        db.destroy();

        // open with new rxdb-version and let auto-migrate
        const db2 = await RxDB.create({
            name,
            adapter: 'memory',
            ignoreDuplicate: true
        });
        const schema = AsyncTestUtil.clone(schemas.human);
        schema.version = 1;
        await db2.collection({
            name,
            schema: schema,
            migrationStrategies: {
                1: oldDoc => oldDoc
            }
        });
        db2.destroy();
    });
});
