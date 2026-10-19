import assert from 'assert';
import { assertThrows } from 'async-test-util';

import config from './config.ts';
import {
    schemaObjects,
    schemas
} from '../../plugins/test-utils/index.mjs';
import {
    addRxPlugin,
    createRxDatabase,
    randomToken,
    RxJsonSchema
} from '../../plugins/core/index.mjs';
import { RxDBLocalDocumentsPlugin } from '../../plugins/local-documents/index.mjs';
import { createAjv } from '../../plugins/validate-ajv/index.mjs';
import {
    wrappedValidateAjvStandaloneStorage,
    getStandaloneValidationSchema,
    ValidatorBySchemaHash,
    AjvStandaloneValidateFunction
} from '../../plugins/validate-ajv-standalone/index.mjs';
import * as ajvStandaloneModule from 'ajv/dist/standalone/index.js';
import * as ucs2lengthModule from 'ajv/dist/runtime/ucs2length.js';

function getCjsDefault(mod: any): any {
    let ret = mod;
    while (typeof ret !== 'function' && ret && ret.default) {
        ret = ret.default;
    }
    return ret;
}

/**
 * Compiles the schemas the same way a developer would do it at build time
 * with the ajv standalone tools and evaluates the generated code.
 */
async function compileValidators(
    rxJsonSchemas: RxJsonSchema<any>[]
): Promise<ValidatorBySchemaHash> {
    const standaloneCode = getCjsDefault(ajvStandaloneModule);
    const ucs2length = getCjsDefault(ucs2lengthModule);
    const ret: ValidatorBySchemaHash = {};
    for (const rxJsonSchema of rxJsonSchemas) {
        const { hash, jsonSchema } = await getStandaloneValidationSchema(rxJsonSchema);
        const ajv = createAjv({ code: { source: true } });
        const code: string = standaloneCode(ajv, ajv.compile(jsonSchema));
        const module: any = { exports: {} };
        const requireShim = (id: string) => {
            if (id === 'ajv/dist/runtime/ucs2length') {
                return { default: ucs2length };
            }
            throw new Error('module not available in test: ' + id);
        };
        new Function('require', 'module', 'exports', code)(requireShim, module, module.exports);
        ret[hash] = module.exports as AjvStandaloneValidateFunction;
    }
    return ret;
}

addRxPlugin(RxDBLocalDocumentsPlugin);

describe('validate-ajv-standalone.test.ts', () => {
    it('should insert valid documents and reject invalid ones', async () => {
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: wrappedValidateAjvStandaloneStorage({
                storage: config.storage.getStorage(),
                validatorBySchemaHash: await compileValidators([schemas.human])
            })
        });
        const collections = await db.addCollections({
            human: {
                schema: schemas.human
            }
        });
        await collections.human.insert(schemaObjects.humanData());

        const human: any = schemaObjects.humanData();
        delete human.firstName;
        await assertThrows(
            () => collections.human.insert(human),
            'RxError',
            'firstName'
        );
        assert.strictEqual(await collections.human.count().exec(), 1);
        await db.close();
    });
    it('should use the same hash as the RxSchema of the collection', async () => {
        const { hash } = await getStandaloneValidationSchema(schemas.human);
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage()
        });
        const collections = await db.addCollections({
            human: {
                schema: schemas.human
            }
        });
        assert.strictEqual(await collections.human.schema.hash, hash);
        await db.close();
    });
    it('should throw VD3 when no validator exists for the schema hash', async () => {
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: wrappedValidateAjvStandaloneStorage({
                storage: config.storage.getStorage(),
                validatorBySchemaHash: await compileValidators([schemas.human])
            })
        });
        await assertThrows(
            () => db.addCollections({
                point: {
                    schema: schemas.point
                }
            }),
            'RxError',
            'VD3'
        );
        await db.close();
    });
    it('should not require validators for the RxDB internal storage instances', async () => {
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: wrappedValidateAjvStandaloneStorage({
                storage: config.storage.getStorage(),
                validatorBySchemaHash: await compileValidators([schemas.human])
            }),
            localDocuments: true
        });
        const collections = await db.addCollections({
            human: {
                schema: schemas.human,
                localDocuments: true
            }
        });
        await db.insertLocal('foo', { bar: 1 });
        await collections.human.insertLocal('foo', { bar: 2 });
        const localDoc = await collections.human.getLocal<{ bar: number; }>('foo');
        assert.strictEqual(localDoc?.get('bar'), 2);
        await db.close();
    });
});
