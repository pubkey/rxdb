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
 * `effect` is a regular dependency (not a peer) of this package, matching how `ajv` is declared
 * for validate-ajv: importing this plugin must be enough for a consumer to validate.
 */
import { JsonSchema, Result, Schema, SchemaRepresentation } from 'effect';
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
    schema: RxJsonSchema<any>
): (docData: RxDocumentData<any>) => RxValidationError[] {
    const document = JsonSchema.fromSchemaDraft2020_12(schema as any);
    const imported = SchemaRepresentation.fromJsonSchemaDocument(document, {
        patterns: 'apply'
    });
    // The importer produces a codec whose decoding services are statically
    // unknown to TypeScript; at runtime all checks here are synchronous.
    const codec = Schema.make(imported.ast) as any;
    const decoder = Schema.decodeUnknownResult(codec, {
        errors: 'first',
        onExcessProperty: 'error'
    });
    return (docData: RxDocumentData<any>) => {
        const result = decoder(docData);
        if (Result.isSuccess(result)) return [];
        return issuesToErrors(result.failure.issue);
    };
}

export const wrappedValidateEffectStorage = wrappedValidateStorageFactory(
    getValidator,
    'effect'
);
