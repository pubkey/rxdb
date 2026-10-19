import type { RxJsonSchema } from '../../plugins/core/index.mjs';
import {
    createAjv,
    getStandaloneValidationSchema,
    type ValidatorBySchemaHash,
    type AjvStandaloneValidateFunction
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
export async function compileAjvStandaloneValidators(
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
