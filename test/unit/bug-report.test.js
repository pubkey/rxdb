import assert from 'assert';
import RxDB from '../../dist/lib/index';
import { filter } from 'rxjs/operators';
import { first } from 'rxjs/operators';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        // Create a schema
        const schema = {
            version: 0,
            disableKeyCompression: true,
            type: 'object',
            properties: {
                name: {type: 'string'},
                number: {type: 'number'}
            }
        };

        // Create db A
        const dbA = await RxDB.create({ name: 'dba', adapter: 'memory' });

        // Create collection A
        const collectionA = await dbA.collection({ name: 'result', schema: schema });

        // Insert documents
        await collectionA.insert({ name: 'aaaa', 'number': 1 });
        await collectionA.insert({ name: 'bbbb', 'number': 2 });

        // Make a query so it gets cached
        await collectionA.find({}).exec();

        // Create db B
        const dbB = await RxDB.create({ name: 'dbb', adapter: 'memory' });

        // Create collection B
        const collectionB = await dbB.collection({ name: 'result', schema: schema });

        // Pull from collection A
        const pullstate = collectionB.sync({
            remote: collectionA.pouch,
            direction: {pull: true, push: false},
            options: {live: false}
        });
        
        // Wait for replication to complete
        await pullstate.complete$
            .pipe(filter(completed => completed.ok === true), first())
            .toPromise();

        // Delete 1 doc from collection B
        const doc = await collectionB.findOne({name: 'aaaa'}).exec();
        await doc.remove();
        await new Promise(r => {setTimeout(r,100);});

        // Push to collection A
        const pushstate = collectionB.sync({
            remote: collectionA.pouch,
            direction: {pull: false, push: true},
            options: {live: false}
        });

        // Wait for replication to complete
        await pushstate.complete$
            .pipe(filter(completed => completed.ok === true), first())
            .toPromise();

        // Collection A should now have 1 doc
        const docsOnA = await collectionA.find({}).exec();
        assert.equal(docsOnA.length, 1);

        // Cleanup
        await dbA.remove();
        await dbA.destroy();
        await dbB.remove();
        await dbB.destroy();
    });
});
