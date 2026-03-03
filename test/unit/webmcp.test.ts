import assert from 'assert';
import {
    createRxDatabase,
    addRxPlugin,
    randomToken,
} from '../../plugins/core/index.mjs';
import { RxDBWebMCPPlugin } from '../../plugins/webmcp/index.mjs';
import config from './config.ts';
import { schemaObjects, schemas } from '../../plugins/test-utils/index.mjs';
import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';

addRxPlugin(RxDBWebMCPPlugin);

describe('webmcp.test.ts', () => {
    let db: any;
    let collection: any;

    const executeTool = async (name: string, args: any) => {
        const res = await (global as any).navigator.modelContextTesting.executeTool(name, JSON.stringify(args));
        const parsed = JSON.parse(res);
        if (parsed.isError) throw new Error(parsed.content[0].text);
        return JSON.parse(parsed.content[0].text);
    };

    const getTools = () => {
        return (global as any).navigator.modelContextTesting.listTools() || [];
    };

    const originalNavigator = typeof navigator !== 'undefined' ? navigator : undefined;

    beforeEach(async () => {
        if (typeof global !== 'undefined' && !(global as any).navigator) {
            (global as any).navigator = {};
        }
        initializeWebMCPPolyfill({ installTestingShim: true, autoInitialize: false });
        if ((global as any).navigator.modelContext) {
            (global as any).navigator.modelContext.clearContext();
        }

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
        try {
            if (originalNavigator) {
                (global as any).navigator = originalNavigator;
            } else {
                delete (global as any).navigator;
            }
        } catch (err) { }
        await db.destroy();
    });

    it('should register query tool when registerWebMCP is called', async () => {
        db.registerWebMCP();

        const tools = getTools();
        assert.strictEqual(tools.length, 7);
        const queryToolName = `rxdb_query_humans_${collection.schema.version}`;
        const queryTool = tools.find((t: any) => t.name.startsWith(queryToolName));
        assert.ok(queryTool, 'queryTool not found');
        assert.ok(queryTool.name.startsWith(queryToolName));
        assert.ok(queryTool.inputSchema.properties.query);

        // Test error decoding URL
        assert.ok(queryTool.description.includes('https://rxdb.info/errors.html'));

        // Test query execution
        await collection.insert(schemaObjects.humanData('alice'));
        const result = await executeTool(queryTool.name, { query: { selector: { age: { $gt: 0 } } } });
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].passportId, 'alice');

        // Test count execution
        const countTool = tools.find((t: any) => t.name.startsWith('rxdb_count'));
        assert.ok(countTool);
        const countResult = await executeTool(countTool.name, { query: { selector: { age: { $gt: 0 } } } });
        assert.strictEqual(countResult.count, 1);

        // Test changes execution
        const changesTool = tools.find((t: any) => t.name.startsWith('rxdb_changes'));
        assert.ok(changesTool);
        const changesResult = await executeTool(changesTool.name, { limit: 10 });
        assert.strictEqual(changesResult.documents.length, 1);
        assert.strictEqual(changesResult.documents[0].passportId, 'alice');

    });

    it('should wait for changes using wait_changes tool', async () => {
        db.registerWebMCP();
        const tools = getTools();
        const waitTool = tools.find((t: any) => t.name.startsWith('rxdb_wait_changes'));
        assert.ok(waitTool);
        let waitResolved = false;
        const waitPromise = executeTool(waitTool.name, {}).then(() => {
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

    it('should iterate over changes using checkpoint', async () => {
        db.registerWebMCP();
        const tools = getTools();
        const changesTool = tools.find((t: any) => t.name.startsWith('rxdb_changes'));

        await collection.insert(schemaObjects.humanData('c_alice'));
        await collection.insert(schemaObjects.humanData('c_bob'));

        const changesResult1 = await executeTool(changesTool.name, { limit: 1 });
        assert.strictEqual(changesResult1.documents.length, 1);
        assert.strictEqual(changesResult1.documents[0].passportId, 'c_alice');

        const checkpoint = changesResult1.checkpoint;
        const changesResult2 = await executeTool(changesTool.name, { limit: 1, checkpoint });
        assert.strictEqual(changesResult2.documents.length, 1);
        assert.strictEqual(changesResult2.documents[0].passportId, 'c_bob');
    });

    it('should execute modifier tools successfully (insert/upsert/delete)', async () => {
        db.registerWebMCP();
        const tools = getTools();
        const insertTool = tools.find((t: any) => t.name.startsWith('rxdb_insert'));
        const upsertTool = tools.find((t: any) => t.name.startsWith('rxdb_upsert'));
        const deleteTool = tools.find((t: any) => t.name.startsWith('rxdb_delete'));

        // Insert
        const docData = schemaObjects.humanData('mod_alice');
        const insertResult = await executeTool(insertTool.name, { document: docData });
        assert.strictEqual(insertResult.passportId, 'mod_alice');

        let docs = await collection.find().exec();
        assert.strictEqual(docs.length, 1);

        // Upsert
        docData.age = 100;
        const upsertResult = await executeTool(upsertTool.name, { document: docData });
        assert.strictEqual(upsertResult.age, 100);

        docs = await collection.find().exec();
        assert.strictEqual(docs.length, 1);
        assert.strictEqual(docs[0].age, 100);

        // Delete
        const deleteResult = await executeTool(deleteTool.name, { id: 'mod_alice' });
        assert.strictEqual(deleteResult._deleted, true);

        docs = await collection.find().exec();
        assert.strictEqual(docs.length, 0);
    });

    it('should unregister tools when collection is closed', async () => {
        db.registerWebMCP();
        let tools = getTools();
        assert.strictEqual(tools.length, 7);
        await collection.close();
        tools = getTools();
        assert.strictEqual(tools.length, 0);
    });

    it('should not register modifier tools when readOnly is true', () => {
        db.registerWebMCP({ readOnly: true });

        const tools = getTools();
        assert.strictEqual(tools.length, 4); // Only query/count/changes/wait should be registered
        const insertTool = tools.find((t: any) => t.name.startsWith('rxdb_insert'));
        assert.ok(!insertTool);
    });

    it('should emit log$ and error$ events for executed tools', async () => {
        const { log$, error$ } = db.registerWebMCP();
        const logs: any[] = [];
        const errors: any[] = [];
        const sub1 = log$.subscribe((e: any) => logs.push(e));
        const sub2 = error$.subscribe((e: any) => errors.push(e));

        const tools = getTools();
        const queryTool = tools.find((t: any) => t.name.startsWith('rxdb_query'));
        await executeTool(queryTool.name, { query: { selector: { age: { $gt: 0 } } } });

        assert.strictEqual(logs.length, 1);
        assert.strictEqual(logs[0].toolName, queryTool.name);
        assert.ok(!logs[0].error);

        // Test error
        const deleteTool = tools.find((t: any) => t.name.startsWith('rxdb_delete'));
        try {
            await executeTool(deleteTool.name, { id: 'does-not-exist' });
        } catch (err) { }

        assert.strictEqual(errors.length, 1);
        assert.strictEqual(logs.length, 2);
        assert.strictEqual(logs[1].toolName, deleteTool.name);
        assert.ok(logs[1].error);

        sub1.unsubscribe();
        sub2.unsubscribe();
    });

    it('should register tools for newly added collections dynamically', async (done) => {
        db.registerWebMCP();
        assert.ok(!getTools().find((t: any) => t.name.includes('aliens')));

        await db.addCollections({
            aliens: {
                schema: schemas.human
            }
        });

        setTimeout(() => {
            try {
                const queryTool = getTools().find((t: any) => t.name.includes('aliens') && t.name.startsWith('rxdb_query'));
                assert.ok(queryTool);
                done();
            } catch (err) {
                done(err);
            }
        }, 100);
    });
});
