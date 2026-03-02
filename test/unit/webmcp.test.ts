import assert from 'assert';
import {
    createRxDatabase,
    addRxPlugin,
    randomToken,
} from '../../plugins/core/index.mjs';
import { RxDBWebMCPPlugin } from '../../plugins/webmcp/index.ts';
import config from '../../test/unit/config.ts';
import { schemaObjects, schemas } from '../../plugins/test-utils/index.mjs';

addRxPlugin(RxDBWebMCPPlugin);

describe('webmcp.test.ts', () => {
    let db: any;
    let collection: any;

    // Mock navigator and modelContext
    let registeredTools: any[] = [];
    const originalNavigator = typeof navigator !== 'undefined' ? navigator : undefined;

    beforeEach(async () => {
        registeredTools = [];
        (global as any).navigator = {
            modelContext: {
                registerTool: (tool: any) => {
                    registeredTools.push(tool);
                }
            }
        };

        db = await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage(),
        });
        const collections = await db.addCollections({
            humans: {
                schema: schemas.human
            }
        });
        collection = collections.humans;
    });

    afterEach(async () => {
        if (originalNavigator) {
            (global as any).navigator = originalNavigator;
        } else {
            delete (global as any).navigator;
        }
        await db.destroy();
    });

    it('should register query tool when registerWebMCP is called', async () => {
        db.registerWebMCP();

        assert.strictEqual(registeredTools.length, 6);
        const queryTool = registeredTools.find(t => t.name.startsWith('rxdb_query_humans_0'));
        assert.ok(queryTool.name.startsWith('rxdb_query_humans_0'));
        assert.ok(queryTool.inputSchema.properties.query);

        // Test error decoding URL
        assert.ok(queryTool.description.includes('https://rxdb.info/errors.html'));

        // Test query execution
        await collection.insert(schemaObjects.humanData('alice'));
        const result = await queryTool.execute({ query: { selector: { age: { $gt: 0 } } } });
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].passportId, 'alice');

        // Test count execution
        const countTool = registeredTools.find((t: any) => t.name.startsWith('rxdb_count'));
        assert.ok(countTool);
        const countResult = await countTool.execute({ query: { selector: { age: { $gt: 0 } } } });
        assert.strictEqual(countResult.count, 1);

        // Test changes execution
        const changesTool = registeredTools.find((t: any) => t.name.startsWith('rxdb_changes'));
        assert.ok(changesTool);
        const changesResult = await changesTool.execute({ limit: 10 });
        assert.strictEqual(changesResult.documents.length, 1);
        assert.strictEqual(changesResult.documents[0].passportId, 'alice');

        // Test wait execution
        const waitTool = registeredTools.find((t: any) => t.name.startsWith('rxdb_wait_changes'));
        assert.ok(waitTool);
        let waitResolved = false;
        const waitPromise = waitTool.execute({}).then(() => {
            waitResolved = true;
        });

        // Ensure it doesn't resolve immediately
        await new Promise(res => setTimeout(res, 50));
        assert.strictEqual(waitResolved, false);

        // Trigger a change
        await collection.insert({ passportId: 'bob', firstName: 'Bob', lastName: 'Ross', age: 42 });
        await waitPromise;
        assert.strictEqual(waitResolved, true);
    });

    it('should not register modifier tools when readOnly is true', async () => {
        db.registerWebMCP({ readOnly: true });

        assert.strictEqual(registeredTools.length, 3); // Only query tools should be registered
        const insertTool = registeredTools.find(t => t.name.startsWith('rxdb_insert'));
        const upsertTool = registeredTools.find(t => t.name.startsWith('rxdb_upsert'));
        assert.ok(upsertTool);

        const newDoc = schemaObjects.humanData('bob');
        const insertResult = await insertTool.execute({ document: newDoc });
        assert.strictEqual(insertResult.passportId, 'bob');

        const docs = await collection.find().exec();
        assert.strictEqual(docs.length, 1);
        assert.strictEqual(docs[0].passportId, 'bob');
    });

    it('should emit log$ and error$ events for executed tools', async () => {
        const { log$, error$ } = db.registerWebMCP();
        const logs: any[] = [];
        const errors: any[] = [];
        const sub1 = log$.subscribe((e: any) => logs.push(e));
        const sub2 = error$.subscribe((e: any) => errors.push(e));

        const queryTool = registeredTools.find((t: any) => t.name.startsWith('rxdb_query'));
        await queryTool.execute({ query: { selector: { age: { $gt: 0 } } } });

        assert.strictEqual(logs.length, 1);
        assert.strictEqual(logs[0].toolName, 'rxdb_query');
        assert.strictEqual(logs[0].toolName, 'rxdb_query_humans_0');
        assert.ok(!logs[0].error);

        // Test error
        const deleteTool = registeredTools.find((t: any) => t.name.startsWith('rxdb_delete'));
        try {
            await deleteTool.execute({ id: 'does-not-exist' });
        } catch (err) { }

        assert.strictEqual(errors.length, 1);
        assert.strictEqual(logs.length, 2);
        assert.strictEqual(logs[1].toolName, 'rxdb_delete_humans_0');
        assert.ok(logs[1].error);

        sub1.unsubscribe();
        sub2.unsubscribe();
    });

    it('should register tools for newly added collections dynamically', async (done) => {
        db.registerWebMCP();
        assert.ok(!registeredTools.find((t: any) => t.name.includes('aliens')));

        await db.addCollections({
            aliens: {
                schema: schemas.human
            }
        });

        setTimeout(() => {
            try {
                const queryTool = registeredTools.find((t: any) => t.name.includes('aliens') && t.name.startsWith('rxdb_query'));
                assert.ok(queryTool);
                done();
            } catch (err) {
                done(err);
            }
        }, 100);
    });
});
