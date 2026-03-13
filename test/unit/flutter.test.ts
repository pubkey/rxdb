import assert from 'assert';
import {
    createRxDatabase,
    randomToken,
} from '../../plugins/core/index.mjs';
import {
    setFlutterRxDatabaseConnector,
} from '../../plugins/flutter/index.mjs';
import config from './config.ts';
import { schemas } from '../../plugins/test-utils/index.mjs';
import { isNode } from '../../plugins/test-utils/index.mjs';

describe('flutter.test.ts', () => {
    if (!isNode) {
        return;
    }

    function cleanupProcessFields() {
        delete (process as any).databases;
        delete (process as any).init;
        delete (process as any).close;
    }

    async function createTestDb(databaseName: string) {
        const rxdb = await createRxDatabase({
            name: databaseName,
            storage: config.storage.getStorage(),
        });
        await rxdb.addCollections({
            humans: {
                schema: schemas.human,
            },
        });
        return rxdb;
    }

    describe('setFlutterRxDatabaseConnector()', () => {
        it('should set process.init and process.close and process.databases', () => {
            cleanupProcessFields();
            setFlutterRxDatabaseConnector((_name: string) => {
                return Promise.resolve({} as any);
            });
            assert.ok(typeof (process as any).init === 'function');
            assert.ok(typeof (process as any).close === 'function');
            assert.ok(typeof (process as any).databases === 'object');
            cleanupProcessFields();
        });

        it('should not reset existing databases when called again', () => {
            cleanupProcessFields();
            setFlutterRxDatabaseConnector((_name: string) => {
                return Promise.resolve({} as any);
            });
            (process as any).databases['existing'] = { db: 'test', eventSub: { unsubscribe() { } } };

            setFlutterRxDatabaseConnector((_name: string) => {
                return Promise.resolve({} as any);
            });
            assert.ok((process as any).databases['existing']);
            cleanupProcessFields();
        });
    });

    describe('process.init()', () => {
        it('should initialize a database and return its config', async () => {
            cleanupProcessFields();
            const sentEvents: string[] = [];
            (global as any).sendRxDBEvent = (json: string) => sentEvents.push(json);

            setFlutterRxDatabaseConnector(createTestDb);

            const dbName = randomToken(10);
            const result = await (process as any).init(dbName);

            assert.strictEqual(result.databaseName, dbName);
            assert.ok(Array.isArray(result.collections));
            assert.strictEqual(result.collections.length, 1);
            assert.strictEqual(result.collections[0].name, 'humans');
            assert.strictEqual(result.collections[0].primaryKey, 'passportId');

            // database should be stored in the map
            assert.ok((process as any).databases[dbName]);
            assert.ok((process as any).databases[dbName].db);
            assert.ok((process as any).databases[dbName].eventSub);

            // cleanup
            await (process as any).close(dbName);
            delete (global as any).sendRxDBEvent;
            cleanupProcessFields();
        });

        it('should forward eventBulks to sendRxDBEvent', async () => {
            cleanupProcessFields();
            const sentEvents: string[] = [];
            (global as any).sendRxDBEvent = (json: string) => sentEvents.push(json);

            setFlutterRxDatabaseConnector(createTestDb);

            const dbName = randomToken(10);
            await (process as any).init(dbName);

            // insert a document to trigger an event
            const storedDb = (process as any).databases[dbName].db;
            await storedDb.humans.insert({
                passportId: 'flutter-test-1',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56,
            });

            // events should have been forwarded
            assert.ok(sentEvents.length > 0);
            const parsed = JSON.parse(sentEvents[0]);
            assert.ok(parsed.events);

            // cleanup
            await (process as any).close(dbName);
            delete (global as any).sendRxDBEvent;
            cleanupProcessFields();
        });

        it('should support multiple databases at the same time', async () => {
            cleanupProcessFields();
            (global as any).sendRxDBEvent = () => { };

            setFlutterRxDatabaseConnector(createTestDb);

            const dbName1 = randomToken(10);
            const dbName2 = randomToken(10);

            const result1 = await (process as any).init(dbName1);
            const result2 = await (process as any).init(dbName2);

            assert.strictEqual(result1.databaseName, dbName1);
            assert.strictEqual(result2.databaseName, dbName2);

            // both databases should exist
            assert.ok((process as any).databases[dbName1]);
            assert.ok((process as any).databases[dbName2]);

            // insert into each database independently
            const db1 = (process as any).databases[dbName1].db;
            const db2 = (process as any).databases[dbName2].db;

            await db1.humans.insert({
                passportId: 'db1-doc',
                firstName: 'Alice',
                lastName: 'One',
                age: 30,
            });
            await db2.humans.insert({
                passportId: 'db2-doc',
                firstName: 'Bob',
                lastName: 'Two',
                age: 40,
            });

            const docs1 = await db1.humans.find().exec();
            const docs2 = await db2.humans.find().exec();
            assert.strictEqual(docs1.length, 1);
            assert.strictEqual(docs2.length, 1);
            assert.strictEqual(docs1[0].passportId, 'db1-doc');
            assert.strictEqual(docs2[0].passportId, 'db2-doc');

            // cleanup
            await (process as any).close(dbName1);
            await (process as any).close(dbName2);
            delete (global as any).sendRxDBEvent;
            cleanupProcessFields();
        });
    });

    describe('process.close()', () => {
        it('should close a database and remove it from the map', async () => {
            cleanupProcessFields();
            (global as any).sendRxDBEvent = () => { };

            setFlutterRxDatabaseConnector(createTestDb);

            const dbName = randomToken(10);
            await (process as any).init(dbName);
            assert.ok((process as any).databases[dbName]);

            await (process as any).close(dbName);
            assert.strictEqual((process as any).databases[dbName], undefined);

            delete (global as any).sendRxDBEvent;
            cleanupProcessFields();
        });

        it('should not throw when closing a non-existent database', async () => {
            cleanupProcessFields();
            setFlutterRxDatabaseConnector((_name: string) => {
                return Promise.resolve({} as any);
            });
            // should not throw
            await (process as any).close('does-not-exist');
            cleanupProcessFields();
        });

        it('should close one database without affecting the other', async () => {
            cleanupProcessFields();
            (global as any).sendRxDBEvent = () => { };

            setFlutterRxDatabaseConnector(createTestDb);

            const dbName1 = randomToken(10);
            const dbName2 = randomToken(10);

            await (process as any).init(dbName1);
            await (process as any).init(dbName2);

            // close only dbName1
            await (process as any).close(dbName1);
            assert.strictEqual((process as any).databases[dbName1], undefined);

            // dbName2 should still be active
            assert.ok((process as any).databases[dbName2]);
            const remainingDb = (process as any).databases[dbName2].db;
            const docs = await remainingDb.humans.find().exec();
            assert.ok(Array.isArray(docs));

            // cleanup
            await (process as any).close(dbName2);
            delete (global as any).sendRxDBEvent;
            cleanupProcessFields();
        });
    });
});
