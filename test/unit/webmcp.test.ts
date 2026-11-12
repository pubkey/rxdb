import assert from 'assert';
import {
    createRxDatabase,
    addRxPlugin,
    randomToken,
} from '../../plugins/core/index.mjs';
import {
    RxDBWebMCPPlugin,
    getWebMCPTools,
    getWebMCPTargetFromCollection,
    registerWebMCPTarget
} from '../../plugins/webmcp/index.mjs';
import config from './config.ts';
import { schemaObjects, schemas, isDeno } from '../../plugins/test-utils/index.mjs';
import { cleanupWebMCPPolyfill, initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import { assertThrows, waitUntil } from 'async-test-util';

addRxPlugin(RxDBWebMCPPlugin);

describe('webmcp.test.ts', () => {
    let db: any;
    let collection: any;

    const executeTool = async (name: string, args: any) => {
        const res = await (global as any).navigator.modelContextTesting.executeTool(name, JSON.stringify(args));
        return JSON.parse(res);
    };

    const getTools = () => {
        return (global as any).navigator.modelContextTesting?.listTools() || [];
    };

    const originalNavigator = typeof navigator !== 'undefined' ? navigator : undefined;

    /**
     * The polyfill only installs itself when a DOM exists,
     * so on non-browser runtimes a jsdom environment is provided.
     * jsdom cannot be loaded in Deno, so the tests that need
     * the polyfill only run on the other runtimes.
     */
    const itWithDom = isDeno ? it.skip : it;
    let removeDom: (() => void) | undefined;

    /**
     * Browsers with native WebMCP support (like Chromium 154) provide
     * document.modelContext. The polyfill does not install itself
     * and its testing shim when a native registry exists, so the native
     * getter is removed while these tests run and restored afterwards.
     */
    let nativeModelContextDescriptor: PropertyDescriptor | undefined;
    before(async () => {
        if (typeof document === 'undefined' && !isDeno) {
            const { default: globalJsdom } = await import(/* webpackIgnore: true */ 'global-jsdom');
            removeDom = globalJsdom();
        }
        cleanupWebMCPPolyfill();
        if (typeof Document !== 'undefined') {
            const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'modelContext');
            if (descriptor && descriptor.configurable) {
                nativeModelContextDescriptor = descriptor;
                delete (Document.prototype as any).modelContext;
            }
        }
    });
    after(() => {
        cleanupWebMCPPolyfill();
        if (nativeModelContextDescriptor) {
            Object.defineProperty(Document.prototype, 'modelContext', nativeModelContextDescriptor);
        }
        if (removeDom) {
            removeDom();
        }
    });

    beforeEach(async () => {
        if (typeof global !== 'undefined' && !(global as any).navigator) {
            (global as any).navigator = {};
        }
        cleanupWebMCPPolyfill();
        initializeWebMCPPolyfill({ installTestingShim: true });

        db = await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage(),
            allowSlowCount: true
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
            cleanupWebMCPPolyfill();
            if (originalNavigator) {
                (global as any).navigator = originalNavigator;
            } else {
                delete (global as any).navigator;
            }
        } catch (err) { }
        await db.close();
    });

    itWithDom('should register query tool when registerWebMCP is called', async () => {
        db.registerWebMCP();

        const tools = getTools();
        assert.strictEqual(tools.length, 7);
        const queryToolName = `rxdb_query_${db.name}_humans_${collection.schema.version}`;
        const queryTool = tools.find((t: any) => t.name.startsWith(queryToolName));
        assert.ok(queryTool, 'queryTool not found');
        assert.ok(queryTool.name.startsWith(queryToolName));
        assert.ok(queryTool.inputSchema);

        // Test error decoding URL
        assert.ok(queryTool.description.includes('https://rxdb.info/errors.html'));

        // Test query execution
        await collection.insert(schemaObjects.humanData('alice'));
        const result = await executeTool(queryTool.name, { query: { selector: { age: { $gt: 0 } } } });
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].passportId, 'alice');

        // Test count execution
        const countTool = tools.find((t: any) => t.name.startsWith(`rxdb_count_${db.name}_humans`));
        assert.ok(countTool);
        const countResult = await executeTool(countTool.name, { query: { selector: { age: { $gt: 0 } } } });
        assert.strictEqual(countResult.count, 1);

        // Test changes execution
        const changesTool = tools.find((t: any) => t.name.startsWith(`rxdb_changes_${db.name}_humans`));
        assert.ok(changesTool);
        const changesResult = await executeTool(changesTool.name, { limit: 10 });
        assert.strictEqual(changesResult.documents.length, 1);
        assert.strictEqual(changesResult.documents[0].passportId, 'alice');

    });

    itWithDom('should wait for changes using wait_changes tool', async () => {
        db.registerWebMCP();
        const tools = getTools();
        const waitTool = tools.find((t: any) => t.name.startsWith(`rxdb_wait_changes_${db.name}_humans`));
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

    itWithDom('changes tool should return documents without internal meta fields', async () => {
        db.registerWebMCP();
        const tools = getTools();
        const queryTool = tools.find((t: any) => t.name.startsWith(`rxdb_query_${db.name}_humans`));
        const changesTool = tools.find((t: any) => t.name.startsWith(`rxdb_changes_${db.name}_humans`));

        await collection.insert(schemaObjects.humanData('meta_alice'));

        // Get document via query tool (uses toJSON, strips meta)
        const queryResult = await executeTool(queryTool.name, { query: { selector: { passportId: 'meta_alice' } } });
        assert.strictEqual(queryResult.length, 1);

        // Get document via changes tool
        const changesResult = await executeTool(changesTool.name, { limit: 10 });
        assert.strictEqual(changesResult.documents.length, 1);

        const queryDoc = queryResult[0];
        const changesDoc = changesResult.documents[0];

        // The changes tool should return documents in the same shape as query tool
        // Internal meta fields like _meta, _rev, _attachments, _deleted should not be exposed
        assert.strictEqual(changesDoc._meta, undefined, 'changes tool should not expose _meta');
        assert.strictEqual(changesDoc._rev, undefined, 'changes tool should not expose _rev');
        assert.strictEqual(changesDoc._attachments, undefined, 'changes tool should not expose _attachments');
        assert.strictEqual(changesDoc._deleted, undefined, 'changes tool should not expose _deleted');

        // The document fields should match between both tools
        assert.deepStrictEqual(
            Object.keys(queryDoc).sort(),
            Object.keys(changesDoc).sort(),
            'changes tool documents should have the same keys as query tool documents'
        );
    });

    itWithDom('should iterate over changes using checkpoint', async () => {
        db.registerWebMCP();
        const tools = getTools();
        const changesTool = tools.find((t: any) => t.name.startsWith(`rxdb_changes_${db.name}_humans`));

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

    itWithDom('should execute modifier tools successfully (insert/upsert/delete)', async () => {
        db.registerWebMCP();
        const tools = getTools();
        const insertTool = tools.find((t: any) => t.name.startsWith(`rxdb_insert_${db.name}_humans`));
        const upsertTool = tools.find((t: any) => t.name.startsWith(`rxdb_upsert_${db.name}_humans`));
        const deleteTool = tools.find((t: any) => t.name.startsWith(`rxdb_delete_${db.name}_humans`));

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
        assert.strictEqual(deleteResult.passportId, 'mod_alice');

        docs = await collection.find().exec();
        assert.strictEqual(docs.length, 0);
    });

    itWithDom('should unregister tools when collection is closed', async () => {
        db.registerWebMCP();
        let tools = getTools();
        assert.strictEqual(tools.length, 7);
        await collection.close();
        tools = getTools();
        assert.strictEqual(tools.length, 0);
    });

    itWithDom('should not register modifier tools when readOnly is true', () => {
        db.registerWebMCP({ readOnly: true });

        const tools = getTools();
        assert.strictEqual(tools.length, 4); // Only query/count/changes/wait should be registered
        const insertTool = tools.find((t: any) => t.name.startsWith(`rxdb_insert_${db.name}_humans`));
        assert.ok(!insertTool);
    });

    it('should throw WMCP2 before registering anything when the tool names are already registered', async () => {
        const toolNames: string[] = [];
        const modelContext = {
            registerTool(tool: any, registerOptions?: any) {
                toolNames.push(tool.name);
                if (registerOptions && registerOptions.signal) {
                    registerOptions.signal.addEventListener('abort', () => {
                        toolNames.splice(toolNames.indexOf(tool.name), 1);
                    });
                }
            }
        };
        const token = randomToken(10);
        const db1 = await createRxDatabase({
            name: token + '_b',
            storage: config.storage.getStorage()
        });
        const db2 = await createRxDatabase({
            name: token,
            storage: config.storage.getStorage()
        });
        await db1.addCollections({ c: { schema: schemas.human } });
        await db2.addCollections({
            aaa: { schema: schemas.human },
            b_c: { schema: schemas.human }
        });

        db1.registerWebMCP({ modelContext });
        assert.strictEqual(toolNames.length, 7);

        // other database and collection that produce the same tool names
        await assertThrows(
            () => db2.registerWebMCP({ modelContext }),
            'RxError',
            'WMCP2'
        );
        assert.strictEqual(toolNames.length, 7);
        assert.strictEqual(new Set(toolNames).size, 7);

        // same collection registered twice
        await assertThrows(
            () => db1.c.registerWebMCP({ modelContext }),
            'RxError',
            'WMCP2'
        );
        assert.strictEqual(toolNames.length, 7);

        // the names are free again after the first collection is closed
        await db1.close();
        assert.strictEqual(toolNames.length, 0);
        db2.registerWebMCP({ modelContext });
        assert.strictEqual(toolNames.length, 14);
        assert.strictEqual(new Set(toolNames).size, 14);

        await db2.close();
    });

    it('should free the tool names and unregister its tools when the registration fails', async () => {
        const toolNames: string[] = [];
        let failAt: string | undefined;
        let failAsync = false;
        const modelContext = {
            registerTool(tool: any, registerOptions?: any) {
                if (failAt && tool.name.startsWith(failAt)) {
                    const registryError = new RangeError('registry rejects ' + tool.name);
                    if (failAsync) {
                        return Promise.reject(registryError);
                    }
                    throw registryError;
                }
                toolNames.push(tool.name);
                if (registerOptions && registerOptions.signal) {
                    registerOptions.signal.addEventListener('abort', () => {
                        toolNames.splice(toolNames.indexOf(tool.name), 1);
                    });
                }
            }
        };
        const database = await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage()
        });
        await database.addCollections({
            aaa: { schema: schemas.human },
            bbb: { schema: schemas.human }
        });
        const registerAndGetError = (instance: any) => {
            try {
                instance.registerWebMCP({ modelContext });
            } catch (err: any) {
                return err;
            }
        };

        // the registry throws at the third tool of the collection
        failAt = 'rxdb_changes_';
        let error = registerAndGetError(database.aaa);
        assert.strictEqual(error.name, 'RangeError');
        failAt = undefined;
        assert.strictEqual(registerAndGetError(database.aaa), undefined);
        assert.strictEqual(toolNames.length, 7);
        assert.strictEqual(new Set(toolNames).size, 7);
        await database.aaa.close();
        assert.deepStrictEqual(toolNames, []);
        await database.addCollections({ aaa: { schema: schemas.human } });

        // the registry throws at a tool of the second collection of the database
        failAt = 'rxdb_changes_' + database.name + '_bbb';
        error = registerAndGetError(database);
        assert.strictEqual(error.name, 'RangeError');
        assert.deepStrictEqual(toolNames, []);

        // the registry rejects the tool asynchronously
        failAt = 'rxdb_changes_';
        failAsync = true;
        const { error$ } = database.aaa.registerWebMCP({ modelContext });
        const emitted: any[] = [];
        const sub = error$.subscribe((err: any) => emitted.push(err));
        await waitUntil(() => emitted.length === 1, 1000);
        sub.unsubscribe();
        assert.strictEqual(emitted[0].name, 'RangeError');
        assert.deepStrictEqual(toolNames, []);

        failAt = undefined;
        assert.strictEqual(registerAndGetError(database), undefined);
        assert.strictEqual(toolNames.length, 14);
        assert.strictEqual(new Set(toolNames).size, 14);

        await database.close();
        assert.deepStrictEqual(toolNames, []);
    });

    it('should unregister its tools at a registry that ignores the signal and has unregisterTool()', async () => {
        const toolNames = new Set<string>();
        const unregisterCalls: string[] = [];
        let failAt: string | undefined;
        const modelContext = {
            registerTool(tool: any) {
                if (toolNames.has(tool.name)) {
                    throw new TypeError('duplicate tool name ' + tool.name);
                }
                if (failAt && tool.name.startsWith(failAt)) {
                    throw new RangeError('registry rejects ' + tool.name);
                }
                toolNames.add(tool.name);
            },
            unregisterTool(name: string) {
                unregisterCalls.push(name);
                toolNames.delete(name);
            }
        };
        const database = await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage()
        });
        await database.addCollections({ aaa: { schema: schemas.human } });

        // the registry throws at the third tool of the collection
        failAt = 'rxdb_changes_';
        await assertThrows(
            () => database.aaa.registerWebMCP({ modelContext }),
            'RangeError',
            'registry rejects'
        );
        assert.strictEqual(toolNames.size, 0);
        // only the two tools that the registry accepted are unregistered
        assert.strictEqual(unregisterCalls.length, 2);
        assert.ok(!unregisterCalls.find(name => name.startsWith('rxdb_changes_')));

        failAt = undefined;
        const target = getWebMCPTargetFromCollection(database.aaa);
        const first = registerWebMCPTarget(target, { modelContext });
        assert.strictEqual(toolNames.size, 7);
        first.unregister();
        assert.strictEqual(toolNames.size, 0);

        // a repeated unregister() must not remove the tools of a later registration
        registerWebMCPTarget(target, { modelContext });
        assert.strictEqual(toolNames.size, 7);
        first.unregister();
        assert.strictEqual(toolNames.size, 7);

        await database.close();
        assert.strictEqual(toolNames.size, 0);
    });

    it('should not unregister the tools of someone else when the registry rejects duplicate names asynchronously', async () => {
        const registryTools = new Map<string, any>();
        const unregisterCalls: string[] = [];
        let holdRegistrations = false;
        const heldRegistrations: (() => void)[] = [];
        const modelContext = {
            registerTool(tool: any): Promise<void> {
                if (registryTools.has(tool.name)) {
                    return Promise.reject(new TypeError('duplicate tool name ' + tool.name));
                }
                registryTools.set(tool.name, tool);
                if (holdRegistrations) {
                    return new Promise<void>(res => heldRegistrations.push(res));
                }
                return Promise.resolve();
            },
            unregisterTool(name: string) {
                unregisterCalls.push(name);
                registryTools.delete(name);
            }
        };
        const database = await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage()
        });
        await database.addCollections({ aaa: { schema: schemas.human } });
        const suffix = database.name + '_aaa_' + database.aaa.schema.version;
        const foreignTools = ['rxdb_query_', 'rxdb_count_', 'rxdb_insert_'].map(prefix => ({
            name: prefix + suffix,
            description: 'tool of the page',
            inputSchema: { type: 'object', properties: {} },
            execute: () => Promise.resolve('foreign')
        }));
        const foreignNames = foreignTools.map(tool => tool.name);
        await Promise.all(foreignTools.map(tool => modelContext.registerTool(tool)));
        const assertOnlyForeignToolsLeft = () => {
            assert.deepStrictEqual(Array.from(registryTools.keys()), foreignNames);
            foreignTools.forEach(tool => assert.strictEqual(registryTools.get(tool.name), tool));
            assert.deepStrictEqual(unregisterCalls.filter(name => foreignNames.includes(name)), []);
        };

        // three of the seven tool names are rejected, the four accepted tools are rolled back
        const { error$ } = database.aaa.registerWebMCP({ modelContext });
        const emitted: any[] = [];
        const sub = error$.subscribe((err: any) => emitted.push(err));
        await waitUntil(() => emitted.length === 3, 1000);
        sub.unsubscribe();
        assert.strictEqual(emitted[0].name, 'TypeError');
        assertOnlyForeignToolsLeft();
        assert.strictEqual(unregisterCalls.length, 4);

        // registrations that are still pending during unregister() are removed when they resolve
        foreignNames.forEach(name => registryTools.delete(name));
        holdRegistrations = true;
        const registration = registerWebMCPTarget(
            getWebMCPTargetFromCollection(database.aaa),
            { modelContext }
        );
        assert.strictEqual(registryTools.size, 7);
        registration.unregister();
        registration.unregister();
        assert.strictEqual(unregisterCalls.length, 4);
        heldRegistrations.forEach(resolve => resolve());
        await waitUntil(() => registryTools.size === 0, 1000);
        assert.strictEqual(unregisterCalls.length, 11);

        await database.close();
        assert.strictEqual(unregisterCalls.length, 11);
    });

    itWithDom('should emit log$ and error$ events for executed tools', async () => {
        const { log$, error$ } = db.registerWebMCP();
        const logs: any[] = [];
        const errors: any[] = [];
        const sub1 = log$.subscribe((e: any) => logs.push(e));
        const sub2 = error$.subscribe((e: any) => errors.push(e));

        const tools = getTools();
        const queryTool = tools.find((t: any) => t.name.startsWith(`rxdb_query_${db.name}_humans`));
        await executeTool(queryTool.name, { query: { selector: { age: { $gt: 0 } } } });

        assert.strictEqual(logs.length, 1);
        assert.strictEqual(logs[0].toolName, queryTool.name);
        assert.ok(!logs[0].error);

        // Test error
        const deleteTool = tools.find((t: any) => t.name.startsWith(`rxdb_delete_${db.name}_humans`));
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

    itWithDom('should register tools for newly added collections dynamically', async () => {
        db.registerWebMCP();
        assert.ok(!getTools().find((t: any) => t.name.includes('aliens')));

        await db.addCollections({
            aliens: {
                schema: schemas.human
            }
        });

        await waitUntil(() => {
            const queryTool = getTools().find((t: any) => t.name.includes('aliens') && t.name.startsWith(`rxdb_query_${db.name}`));
            return !!queryTool;
        });
    });

    describe('custom targets', () => {
        /**
         * A target that is not backed by an RxCollection at all.
         * This is what a devtool or a viewer uses when the collection
         * lives in another process or on another device.
         */
        const getTestTarget = (documents: any[] = []) => {
            const closeHandlers: (() => void)[] = [];
            let awaitInSyncCalls = 0;
            const target = {
                databaseName: 'remotedb',
                collectionName: 'remotehumans',
                schemaVersion: 0,
                primaryPath: 'passportId',
                jsonSchema: schemas.human,
                awaitInSync: () => {
                    awaitInSyncCalls++;
                    return Promise.resolve();
                },
                query: () => Promise.resolve(documents.slice()),
                count: () => Promise.resolve(documents.length),
                changesSince: (limit: number) => Promise.resolve({
                    documents: documents.slice(0, limit),
                    checkpoint: { position: documents.length }
                }),
                awaitChange: () => Promise.resolve(),
                insert: (document: any) => {
                    documents.push(document);
                    return Promise.resolve(document);
                },
                upsert: (document: any) => {
                    documents.push(document);
                    return Promise.resolve(document);
                },
                remove: (id: string) => Promise.resolve(documents.find(d => d.passportId === id)),
                onClose: (fn: () => void) => {
                    closeHandlers.push(fn);
                }
            };
            return {
                target,
                documents,
                close: () => closeHandlers.forEach(fn => fn()),
                getAwaitInSyncCalls: () => awaitInSyncCalls
            };
        };

        const getTestModelContext = () => {
            const tools: any[] = [];
            return {
                tools,
                registerTool(tool: any, registerOptions?: any) {
                    tools.push(tool);
                    if (registerOptions && registerOptions.signal) {
                        registerOptions.signal.addEventListener('abort', () => {
                            const index = tools.indexOf(tool);
                            if (index >= 0) {
                                tools.splice(index, 1);
                            }
                        });
                    }
                }
            };
        };

        it('should build the same tools for a target that is not an RxCollection', async () => {
            const { target, documents } = getTestTarget([schemaObjects.humanData('remote_alice')]);
            const tools = getWebMCPTools(target);

            assert.strictEqual(tools.length, 7);
            assert.deepStrictEqual(
                tools.map(t => t.name),
                [
                    'rxdb_query_remotedb_remotehumans_0',
                    'rxdb_count_remotedb_remotehumans_0',
                    'rxdb_changes_remotedb_remotehumans_0',
                    'rxdb_wait_changes_remotedb_remotehumans_0',
                    'rxdb_insert_remotedb_remotehumans_0',
                    'rxdb_upsert_remotedb_remotehumans_0',
                    'rxdb_delete_remotedb_remotehumans_0'
                ]
            );

            const queryTool: any = tools.find(t => t.name.startsWith('rxdb_query_'));
            const queryResult = await queryTool.execute({ query: { selector: {} } });
            assert.strictEqual(queryResult.length, 1);
            assert.strictEqual(queryResult[0].passportId, 'remote_alice');

            const countTool: any = tools.find(t => t.name.startsWith('rxdb_count_'));
            assert.deepStrictEqual(await countTool.execute({ query: { selector: {} } }), { count: 1 });

            const insertTool: any = tools.find(t => t.name.startsWith('rxdb_insert_'));
            await insertTool.execute({ document: schemaObjects.humanData('remote_bob') });
            assert.strictEqual(documents.length, 2);
        });

        it('should throw WMCP1 from a target that has no such document', async () => {
            const { target } = getTestTarget();
            const tools = getWebMCPTools(target);
            const deleteTool: any = tools.find(t => t.name.startsWith('rxdb_delete_'));
            let hasThrown = false;
            try {
                await deleteTool.execute({ id: 'does-not-exist' });
            } catch (err: any) {
                hasThrown = true;
                assert.ok(JSON.stringify(err).includes('WMCP1'));
            }
            assert.ok(hasThrown);
        });

        it('should not build modifier tools for a readOnly target', () => {
            const { target } = getTestTarget();
            const tools = getWebMCPTools(target, { readOnly: true });
            assert.strictEqual(tools.length, 4);
            assert.ok(!tools.find(t => t.name.startsWith('rxdb_insert_')));
        });

        it('should respect awaitReplicationsInSync on a target', async () => {
            const withSync = getTestTarget();
            const queryTool: any = getWebMCPTools(withSync.target)
                .find(t => t.name.startsWith('rxdb_query_'));
            await queryTool.execute({ query: { selector: {} } });
            assert.strictEqual(withSync.getAwaitInSyncCalls(), 1);

            const withoutSync = getTestTarget();
            const queryTool2: any = getWebMCPTools(withoutSync.target, { awaitReplicationsInSync: false })
                .find(t => t.name.startsWith('rxdb_query_'));
            await queryTool2.execute({ query: { selector: {} } });
            assert.strictEqual(withoutSync.getAwaitInSyncCalls(), 0);
        });

        it('should register at a given modelContext and unregister on close', () => {
            const { target, close } = getTestTarget();
            const modelContext = getTestModelContext();

            registerWebMCPTarget(target, { modelContext });
            assert.strictEqual(modelContext.tools.length, 7);
            // must not touch the global registry
            assert.strictEqual(getTools().length, 0);

            close();
            assert.strictEqual(modelContext.tools.length, 0);
        });

        it('should emit log$ and error$ for a target', async () => {
            const { target } = getTestTarget();
            const modelContext = getTestModelContext();
            const { log$, error$ } = registerWebMCPTarget(target, { modelContext });

            const logs: any[] = [];
            const errors: any[] = [];
            const sub1 = log$.subscribe(e => logs.push(e));
            const sub2 = error$.subscribe(e => errors.push(e));

            const queryTool: any = modelContext.tools.find((t: any) => t.name.startsWith('rxdb_query_'));
            await queryTool.execute({ query: { selector: {} } });
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].databaseName, 'remotedb');
            assert.strictEqual(logs[0].collectionName, 'remotehumans');

            const deleteTool: any = modelContext.tools.find((t: any) => t.name.startsWith('rxdb_delete_'));
            try {
                await deleteTool.execute({ id: 'does-not-exist' });
            } catch (err) { }
            assert.strictEqual(errors.length, 1);

            sub1.unsubscribe();
            sub2.unsubscribe();
        });

        it('should build a working target from an RxCollection', async () => {
            await collection.insert(schemaObjects.humanData('from_collection'));
            const target = getWebMCPTargetFromCollection(collection);
            assert.strictEqual(target.databaseName, db.name);
            assert.strictEqual(target.collectionName, 'humans');

            const docs = await target.query({ selector: {} });
            assert.strictEqual(docs.length, 1);
            assert.strictEqual(docs[0].passportId, 'from_collection');
            assert.strictEqual(await target.count({ selector: {} }), 1);
            assert.strictEqual(await target.remove('does-not-exist'), undefined);
        });
    });
});
