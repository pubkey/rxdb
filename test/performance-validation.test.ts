import * as assert from 'assert';
import {
    createRxDatabase,
    overwritable,
    randomToken,
    RxJsonSchema,
    RxStorage
} from '../plugins/core/index.mjs';
import {
    isFastMode,
    schemaObjects,
    schemas,
    HumanDocumentType
} from '../plugins/test-utils/index.mjs';
import { wrappedValidateAjvStorage } from '../plugins/validate-ajv/index.mjs';
import { wrappedValidateAjvStandaloneStorage } from '../plugins/validate-ajv-standalone/index.mjs';
import config from './unit/config.ts';
import { compileAjvStandaloneValidators } from './helper/ajv-standalone.ts';

/**
 * Compares the performance of the runtime ajv validation
 * with the precompiled ajv standalone validation.
 * Run via 'npm run test:performance:validation'.
 *
 * Each run uses a schema with a unique title so that
 * the runtime ajv plugin has to compile the schema again
 * and cannot reuse a cached validator from a previous run.
 * Notice that the time-to-first-insert of ajv-standalone includes
 * hashing the schema, but not the build-time compilation.
 */
describe('performance-validation.test.ts', () => {
    it('should not have enabled dev-mode which would affect the performance', () => {
        assert.strictEqual(overwritable.isDevMode(), false);
    });
    it('compare validate-ajv with validate-ajv-standalone', async function () {
        this.timeout(500 * 1000);
        const runs = isFastMode() ? 1 : 40;
        const docsAmount = 3000;
        const warmupRuns = 2;

        const implementationNames = ['no validator', 'ajv', 'ajv-standalone'];
        /**
         * Every implementation gets its own schemas
         * so that no implementation profits from schema related caches
         * that were filled by another implementation in the same run.
         */
        const schemasByImplementation: { [name: string]: RxJsonSchema<HumanDocumentType>[]; } = {};
        implementationNames.forEach(name => {
            schemasByImplementation[name] = new Array(runs + warmupRuns)
                .fill(0)
                .map((_, i) => Object.assign({}, schemas.human, { title: 'human-perf-' + name + '-' + i }));
        });
        const validatorBySchemaHash = await compileAjvStandaloneValidators(
            schemasByImplementation['ajv-standalone']
        );

        const implementations: {
            name: string;
            getStorage: () => RxStorage<any, any>;
        }[] = [
                {
                    name: 'no validator',
                    getStorage: () => config.storage.getPerformanceStorage().storage
                },
                {
                    name: 'ajv',
                    getStorage: () => wrappedValidateAjvStorage({ storage: config.storage.getPerformanceStorage().storage })
                },
                {
                    name: 'ajv-standalone',
                    getStorage: () => wrappedValidateAjvStandaloneStorage({
                        storage: config.storage.getPerformanceStorage().storage,
                        validatorBySchemaHash
                    })
                }
            ];

        const timings: { [name: string]: { [metric: string]: number[]; }; } = {};
        implementations.forEach(impl => timings[impl.name] = {
            'time-to-first-insert': [],
            'insert-3000-documents': []
        });
        const runGc = () => {
            if (typeof (globalThis as any).gc === 'function') {
                (globalThis as any).gc();
            }
        };
        const median = (values: number[]) => {
            const sorted = values.slice().sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const ret = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
            return Math.round(ret * 100) / 100;
        };

        for (let run = 0; run < runs + warmupRuns; run++) {
            const docs = new Array(docsAmount).fill(0).map((_, i) => schemaObjects.humanData('doc-' + i));
            const firstDoc = schemaObjects.humanData('first-doc');
            // rotate the order so that every implementation runs first equally often
            const ordered = implementations.map((_, i) => implementations[(i + run) % implementations.length]);
            for (const impl of ordered) {
                const schema = schemasByImplementation[impl.name][run];
                runGc();
                const startFirstInsert = performance.now();
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: impl.getStorage()
                });
                const collections = await db.addCollections({
                    human: { schema }
                });
                await collections.human.insert(firstDoc);
                const timeToFirstInsert = performance.now() - startFirstInsert;

                runGc();
                const startBulkInsert = performance.now();
                const bulkResult = await collections.human.bulkInsert(docs);
                const bulkInsertTime = performance.now() - startBulkInsert;
                assert.strictEqual(bulkResult.error.length, 0);

                if (run >= warmupRuns) {
                    timings[impl.name]['time-to-first-insert'].push(timeToFirstInsert);
                    timings[impl.name]['insert-3000-documents'].push(bulkInsertTime);
                }
                await db.remove();
            }
        }

        const result = implementations.map(impl => ({
            name: impl.name,
            'time-to-first-insert': median(timings[impl.name]['time-to-first-insert']),
            'insert-3000-documents': median(timings[impl.name]['insert-3000-documents'])
        }));
        console.log('## PERFORMANCE RESULT (validation, ' + config.storage.name + ', ' + runs + ' runs, median in milliseconds):');
        console.log(JSON.stringify(result, null, 4));
    });
});
