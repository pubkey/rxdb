import assert from 'assert';
import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
} from '../../plugins/test-utils/index.mjs';
import {
    createRxDatabase,
    randomToken,
    defaultConflictHandler,
} from '../../plugins/core/index.mjs';
import type {
    RxConflictHandler,
    RxConflictHandlerInput,
    WithDeleted,
} from '../../plugins/core/index.mjs';
import type { HumanDocumentType } from '../../src/plugins/test-utils/schemas.ts';


function humanWithDeleted(data?: Partial<HumanDocumentType & { _deleted: boolean; }>): WithDeleted<HumanDocumentType> {
    return Object.assign(
        schemaObjects.humanData(),
        { _deleted: false },
        data
    );
}


describeParallel('conflict-handling.test.js', () => {
    describe('defaultConflictHandler', () => {
        describe('.isEqual()', () => {
            it('should return true for equal documents', () => {
                const doc = humanWithDeleted({ passportId: 'equal-test' });
                const ret = defaultConflictHandler.isEqual(doc, Object.assign({}, doc), 'test');
                assert.strictEqual(ret, true);
            });

            it('should return false when documents differ', () => {
                const docA = humanWithDeleted({ passportId: 'diff-test', firstName: 'Alice' });
                const docB = humanWithDeleted({ passportId: 'diff-test', firstName: 'Bob' });
                const ret = defaultConflictHandler.isEqual(docA, docB, 'test');
                assert.strictEqual(ret, false);
            });

            it('should return false when age differs', () => {
                const docA = humanWithDeleted({ passportId: 'age-test', age: 20 });
                const docB = humanWithDeleted({ passportId: 'age-test', age: 30 });
                const ret = defaultConflictHandler.isEqual(docA, docB, 'test');
                assert.strictEqual(ret, false);
            });

            it('should return true for documents that only differ in _deleted flag when both have same value', () => {
                const docA = humanWithDeleted({ passportId: 'del-test', _deleted: false });
                const docB = humanWithDeleted({ passportId: 'del-test', _deleted: false });
                docB.firstName = docA.firstName;
                docB.lastName = docA.lastName;
                docB.age = docA.age;
                const ret = defaultConflictHandler.isEqual(docA, docB, 'test');
                assert.strictEqual(ret, true);
            });

            it('should return false when _deleted flag differs', () => {
                const base = humanWithDeleted({ passportId: 'del-diff' });
                const docA = Object.assign({}, base, { _deleted: false });
                const docB = Object.assign({}, base, { _deleted: true });
                const ret = defaultConflictHandler.isEqual(docA, docB, 'test');
                assert.strictEqual(ret, false);
            });

            it('should handle documents without _attachments', () => {
                const docA = humanWithDeleted({ passportId: 'no-attach' });
                const docB = Object.assign({}, docA);
                const ret = defaultConflictHandler.isEqual(docA, docB, 'test');
                assert.strictEqual(ret, true);
            });

            it('should handle documents where one has _attachments and other does not', () => {
                const docA: any = humanWithDeleted({ passportId: 'attach-diff' });
                const docB: any = Object.assign({}, docA, { _attachments: {} });
                const ret = defaultConflictHandler.isEqual(docA, docB, 'test');
                assert.strictEqual(ret, true);
            });
        });

        describe('.resolve()', () => {
            it('should return the realMasterState (master wins)', async () => {
                const master = humanWithDeleted({ passportId: 'resolve-test', firstName: 'Master' });
                const local = humanWithDeleted({ passportId: 'resolve-test', firstName: 'Local' });
                const input: RxConflictHandlerInput<HumanDocumentType> = {
                    realMasterState: master,
                    newDocumentState: local,
                };
                const result = await defaultConflictHandler.resolve(input, 'test');
                assert.strictEqual(result.firstName, 'Master');
                assert.deepStrictEqual(result, master);
            });

            it('should return realMasterState even when newDocumentState has different age', async () => {
                const master = humanWithDeleted({ passportId: 'age-resolve', age: 50 });
                const local = humanWithDeleted({ passportId: 'age-resolve', age: 25 });
                const input: RxConflictHandlerInput<HumanDocumentType> = {
                    realMasterState: master,
                    newDocumentState: local,
                };
                const result = await defaultConflictHandler.resolve(input, 'test');
                assert.strictEqual(result.age, 50);
            });

            it('should return realMasterState when assumedMasterState is provided', async () => {
                const assumed = humanWithDeleted({ passportId: 'assumed-test', firstName: 'Assumed' });
                const master = humanWithDeleted({ passportId: 'assumed-test', firstName: 'Master' });
                const local = humanWithDeleted({ passportId: 'assumed-test', firstName: 'Local' });
                const input: RxConflictHandlerInput<HumanDocumentType> = {
                    assumedMasterState: assumed,
                    realMasterState: master,
                    newDocumentState: local,
                };
                const result = await defaultConflictHandler.resolve(input, 'test');
                assert.strictEqual(result.firstName, 'Master');
            });

            it('should handle deleted master state', async () => {
                const master = humanWithDeleted({ passportId: 'del-master', _deleted: true });
                const local = humanWithDeleted({ passportId: 'del-master', _deleted: false });
                const input: RxConflictHandlerInput<HumanDocumentType> = {
                    realMasterState: master,
                    newDocumentState: local,
                };
                const result = await defaultConflictHandler.resolve(input, 'test');
                assert.strictEqual(result._deleted, true);
            });
        });
    });

    describe('RxCollection with conflictHandler', () => {
        it('should set the default conflict handler on a collection', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human,
                },
            });
            const col = cols.humans;

            assert.ok(col.conflictHandler);
            assert.ok(typeof col.conflictHandler.isEqual === 'function');
            assert.ok(typeof col.conflictHandler.resolve === 'function');

            db.close();
        });

        it('should use a custom conflict handler when provided', async () => {
            const customHandler: RxConflictHandler<HumanDocumentType> = {
                isEqual(a, b) {
                    return a.passportId === b.passportId;
                },
                resolve(i) {
                    return Promise.resolve(i.newDocumentState);
                }
            };

            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human,
                    conflictHandler: customHandler,
                },
            });
            const col = cols.humans;

            const docA = humanWithDeleted({ passportId: 'same-id', firstName: 'A' });
            const docB = humanWithDeleted({ passportId: 'same-id', firstName: 'B' });
            assert.strictEqual(col.conflictHandler.isEqual(docA, docB, 'test'), true);

            db.close();
        });
    });

    describe('RxStorageInterface', () => {
        it('defaultConflictHandler.isEqual should be a synchronous function', () => {
            const doc = humanWithDeleted({ passportId: 'sync-test' });
            const result = defaultConflictHandler.isEqual(doc, Object.assign({}, doc), 'test');
            assert.strictEqual(typeof result, 'boolean');
        });

        it('defaultConflictHandler.resolve should return a Promise', () => {
            const input: RxConflictHandlerInput<HumanDocumentType> = {
                realMasterState: humanWithDeleted({ passportId: 'promise-test' }),
                newDocumentState: humanWithDeleted({ passportId: 'promise-test' }),
            };
            const result = defaultConflictHandler.resolve(input, 'test');
            assert.ok(result !== undefined);
        });
    });
});
