/**
 * Validates RxDB documents before they are written, using Effect Schema's
 * stable Draft 2020-12 JSON Schema importer. The full RxDB schema, including
 * `_deleted`/`_rev`/`_meta`/`_attachments`, is validated, and failures are
 * mapped to the familiar Ajv-style `RxValidationError` shape.
 *
 * Validation uses only published Effect 4.1.4 API: a single `decodeUnknownResult` with
 * `errors: "first"` and `onExcessProperty: "error"`. First-error collection matches RxDB's Ajv
 * configuration (allErrors is off), is enough to produce a 422, and avoids the cost of collecting
 * every issue.
 *
 * Effect imports `format` as an annotation and does not enforce it, so this plugin owns format
 * validation. It uses ajv-formats' full definitions for the standard keywords, compiles the
 * checks once per schema and reports failures with the document field path and `format` keyword.
 *
 * This stacked change adds an optional boolean gate ahead of the base plugin's decode.
 * The installed Effect is feature-detected at runtime: when it exposes `Schema.validate`,
 * the gate accepts or rejects without constructing a decoded copy or issue objects, and
 * the detailed decode runs only on rejection. Published Effect 4.1.4 has no such API, so
 * the gate is dormant there and the base 4.1.4 decode path is the default.
 *
 * `effect` is a regular dependency (not a peer) of this package, matching how `ajv` is declared
 * for validate-ajv: importing this plugin must be enough for a consumer to validate.
 */
import { JsonSchema, Result, Schema, SchemaRepresentation } from 'effect';
import { fullFormats } from 'ajv-formats/dist/formats.js';
import type {
    RxDocumentData,
    RxJsonSchema,
    RxValidationError
} from '../../types/index.d.ts';
import { wrappedValidateStorageFactory } from '../../plugin-helpers.ts';

function keywordOf(id: string | undefined): string {
    switch (id) {
        case 'effect/schema/isMinLength': return 'minLength';
        case 'effect/schema/isMaxLength':
        case 'effect/schema/isMaxCodePoints': return 'maxLength';
        case 'effect/schema/isPattern': return 'pattern';
        case 'effect/schema/isGreaterThanOrEqualTo': return 'minimum';
        case 'effect/schema/isGreaterThan': return 'exclusiveMinimum';
        case 'effect/schema/isLessThanOrEqualTo': return 'maximum';
        case 'effect/schema/isLessThan': return 'exclusiveMaximum';
        case 'effect/schema/isInt': return 'type';
        default: return 'type';
    }
}

function pointer(path: readonly (string | number)[]): string {
    return path.length === 0 ? '' : '/' + path.map(String).join('/');
}

function makeError(
    path: readonly (string | number)[],
    keyword: string,
    message: string,
    params: Record<string, unknown>
): RxValidationError & Record<string, unknown> {
    const instancePath = pointer(path);
    return {
        field: path.length > 0 ? String(path[0]) : '',
        message,
        keyword,
        instancePath,
        schemaPath: '#/properties' + instancePath,
        params,
        dataPath: instancePath
    };
}

type FormatCheck = (value: string) => boolean;

type FormatNode = {
    format?: string;
    check?: FormatCheck;
    properties?: Map<string, FormatNode>;
    items?: FormatNode;
    additionalProperties?: FormatNode;
};

/**
 * ajv-formats defines a format either as a RegExp, a predicate or an object with a
 * `validate` member. Normalize all three shapes once and reuse the compiled predicate.
 */
const FORMAT_CHECK_CACHE = new Map<string, FormatCheck>();

function getFormatCheck(format: string): FormatCheck | undefined {
    if (!FORMAT_CHECK_CACHE.has(format)) {
        const definition = (fullFormats as Record<string, any>)[format];
        let check: FormatCheck | undefined;
        if (typeof definition === 'function') {
            check = definition as FormatCheck;
        } else if (definition instanceof RegExp) {
            check = (value: string) => definition.test(value);
        } else if (definition && typeof definition === 'object') {
            if (typeof definition.validate === 'function') {
                check = definition.validate as FormatCheck;
            } else if (definition.validate instanceof RegExp) {
                const regexp: RegExp = definition.validate;
                check = (value: string) => regexp.test(value);
            }
        }
        if (check) {
            FORMAT_CHECK_CACHE.set(format, check);
        }
    }
    return FORMAT_CHECK_CACHE.get(format);
}

/** Compile the schema's `format` keywords into a tree that can be reused per document. */
function compileFormatNode(schema: any): FormatNode | undefined {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
        return undefined;
    }
    const node: FormatNode = {};
    if (typeof schema.format === 'string') {
        const check = getFormatCheck(schema.format);
        if (check) {
            node.format = schema.format;
            node.check = check;
        }
    }
    if (schema.properties && typeof schema.properties === 'object') {
        const properties = new Map<string, FormatNode>();
        Object.keys(schema.properties).forEach(key => {
            const child = compileFormatNode(schema.properties[key]);
            if (child) {
                properties.set(key, child);
            }
        });
        if (properties.size > 0) {
            node.properties = properties;
        }
    }
    if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
        const items = compileFormatNode(schema.items);
        if (items) {
            node.items = items;
        }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        const additionalProperties = compileFormatNode(schema.additionalProperties);
        if (additionalProperties) {
            node.additionalProperties = additionalProperties;
        }
    }
    return Object.keys(node).length > 0 ? node : undefined;
}

function formatErrors(
    node: FormatNode | undefined,
    docData: any,
    path: (string | number)[] = []
): RxValidationError[] {
    if (!node) {
        return [];
    }
    const out: RxValidationError[] = [];
    if (node.check && typeof docData === 'string' && !node.check(docData)) {
        out.push(makeError(
            path,
            'format',
            'must match format "' + node.format + '"',
            { format: node.format }
        ) as RxValidationError);
    }
    if (docData === null || typeof docData !== 'object') {
        return out;
    }
    if (node.properties) {
        node.properties.forEach((child, key) => {
            if (Object.prototype.hasOwnProperty.call(docData, key)) {
                out.push(...formatErrors(child, docData[key], [...path, key]));
            }
        });
    }
    if (node.items && Array.isArray(docData)) {
        docData.forEach((item, index) => {
            out.push(...formatErrors(node.items, item, [...path, index]));
        });
    }
    if (node.additionalProperties && !Array.isArray(docData)) {
        Object.keys(docData).forEach(key => {
            if (node.properties && node.properties.has(key)) {
                return;
            }
            out.push(...formatErrors(node.additionalProperties, docData[key], [...path, key]));
        });
    }
    return out;
}

/** Flatten Effect's Filter/Pointer/Composite issue tree into leaf errors. */
export function issuesToErrors(issue: any): RxValidationError[] {
    const out: RxValidationError[] = [];
    function walk(current: any, path: readonly (string | number)[]): void {
        if (!current) return;
        const nextPath = Array.isArray(current.path)
            ? [...path, ...current.path.map(String)]
            : path;
        const annotation = current.filter && current.filter.annotations;
        const representation = annotation && annotation.representation;
        if (current._tag === 'Filter' && representation) {
            out.push(makeError(nextPath, keywordOf(representation.id),
                String(annotation.expected ?? 'validation failed'), representation.payload ?? {}) as any);
            return;
        }
        if (current._tag === 'MissingKey') {
            out.push(makeError(nextPath, 'required', 'missing property', {}) as any);
            return;
        }
        if (current._tag === 'UnexpectedKey') {
            out.push(makeError(nextPath, 'additionalProperties', 'must NOT have additional properties', {}) as any);
            return;
        }
        if (current._tag === 'Type' || current._tag === 'InvalidType') {
            // The importer models `additionalProperties: true` with an implicit
            // Schema.Json value check. That check is stricter than the authored
            // schema, which declares no constraint on those values, and it
            // rejects internal RxDB documents containing `undefined` entries.
            // It is not a declared keyword, so it must not produce a 422.
            const representationId = current.ast?.annotations?.representation?.id;
            if (representationId === 'effect/schema/Json') {
                return;
            }
            // Effect 4.1.4 emits InvalidType leaves for failed declared type
            // checks. Handle them alongside the legacy Type tag so the leaf
            // is not silently dropped (which would accept invalid documents).
            const expected = typeof current.ast?.getExpected === 'function'
                ? current.ast.getExpected()
                : undefined;
            out.push(makeError(nextPath, 'type', String(expected ?? annotation?.expected ?? 'expected a different type'), {}) as any);
            return;
        }
        if (current._tag === 'AnyOf') {
            out.push(makeError(nextPath, 'enum', 'value is not an allowed member', {}) as any);
            return;
        }
        if (Array.isArray(current.issues)) current.issues.forEach((inner: any) => walk(inner, nextPath));
        if (current.issue) walk(current.issue, nextPath);
        if (Array.isArray(current.causes)) current.causes.forEach((inner: any) => walk(inner, nextPath));
    }
    walk(issue, []);
    return out;
}

export function getValidator(
    schema: RxJsonSchema<any>,
    options?: { readonly validate?: boolean }
): (docData: RxDocumentData<any>) => RxValidationError[] {
    const document = JsonSchema.fromSchemaDraft2020_12(schema as any);
    const imported = SchemaRepresentation.fromJsonSchemaDocument(document, {
        patterns: 'apply'
    });
    // The importer produces a codec whose decoding services are statically
    // unknown to TypeScript; at runtime all checks here are synchronous.
    const codec = Schema.make(imported.ast) as any;
    // Detection is narrow: 4.1.4 has no `validate`. `options.validate = false`
    // forces the base path so the test can compare both contracts.
    const validate = options?.validate !== false && typeof (Schema as any).validate === 'function'
        ? (Schema as any).validate(codec, { errors: 'first', onExcessProperty: 'error' }) as
            (docData: RxDocumentData<any>) => boolean
        : undefined;
    const decoder = Schema.decodeUnknownResult(codec, {
        errors: 'first',
        onExcessProperty: 'error'
    });
    const formatNode = compileFormatNode(schema);
    return (docData: RxDocumentData<any>) => {
        if (validate !== undefined && validate(docData)) return formatErrors(formatNode, docData);
        const result = decoder(docData);
        if (Result.isSuccess(result)) return formatErrors(formatNode, docData);
        return issuesToErrors(result.failure.issue);
    };
}

export const wrappedValidateEffectStorage = wrappedValidateStorageFactory(
    getValidator,
    'effect'
);
