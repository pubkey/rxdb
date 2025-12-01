import {
    GraphQLSchemaFromRxSchemaInputSingleCollection,
    fillUpOptionals,
    Prefixes,
    SPACING
} from './graphql-schema-from-rx-schema.ts';
import { ensureNotFalsy, ucfirst } from '../../plugins/utils/index.ts';
import type {
    RxGraphQLReplicationPullQueryBuilder,
    RxGraphQLReplicationPullStreamQueryBuilder,
    RxGraphQLReplicationPushQueryBuilder,
    RxJsonSchema,
    TopLevelProperty,
    WithDeleted
} from '../../types/index.d.ts';

export function pullQueryBuilderFromRxSchema(
    collectionName: string,
    input: GraphQLSchemaFromRxSchemaInputSingleCollection,
): RxGraphQLReplicationPullQueryBuilder<any> {
    input = fillUpOptionals(input);
    const schema = input.schema
    const prefixes: Prefixes = input.prefixes as any;

    const ucCollectionName = ucfirst(collectionName);
    const queryName = prefixes.pull + ucCollectionName;
    const operationName = ucfirst(queryName);

    const outputFields = generateGQLOutputFields({ schema, ignoreOutputKeys: input.ignoreOutputKeys })
    // outputFields.push(input.deletedField);    

    const checkpointInputName = ucCollectionName + 'Input' + prefixes.checkpoint;
    const builder: RxGraphQLReplicationPullQueryBuilder<any> = (checkpoint: any, limit: number) => {
        const query = 'query ' + operationName + '($checkpoint: ' + checkpointInputName + ', $limit: Int!) {\n' +
            SPACING + SPACING + queryName + '(checkpoint: $checkpoint, limit: $limit) {\n' +
            SPACING + SPACING + SPACING + 'documents {\n' +
            outputFields + '\n' +
            SPACING + SPACING + SPACING + '}\n' +
            SPACING + SPACING + SPACING + 'checkpoint {\n' +
            SPACING + SPACING + SPACING + SPACING + input.checkpointFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' +
            SPACING + SPACING + SPACING + '}\n' +
            SPACING + SPACING + '}\n' +
            '}';
        return {
            query,
            operationName,
            variables: {
                checkpoint,
                limit
            }
        };
    };

    return builder;
}

export function pullStreamBuilderFromRxSchema(
    collectionName: string,
    input: GraphQLSchemaFromRxSchemaInputSingleCollection,
) {
    input = fillUpOptionals(input);
    const schema = input.schema;
    const prefixes: Prefixes = input.prefixes as any;

    const ucCollectionName = ucfirst(collectionName);
    const queryName = prefixes.stream + ucCollectionName;
    const outputFields = generateGQLOutputFields({ schema, ignoreOutputKeys: input.ignoreOutputKeys })

    const headersName = ucCollectionName + 'Input' + prefixes.headers;

    const query = 'subscription on' + ucfirst(ensureNotFalsy(prefixes.stream)) + '($headers: ' + headersName + ') {\n' +
        SPACING + queryName + '(headers: $headers) {\n' +
        SPACING + SPACING + SPACING + 'documents {\n' +
        outputFields + '\n' +
        SPACING + SPACING + SPACING + '}\n' +
        SPACING + SPACING + SPACING + 'checkpoint {\n' +
        SPACING + SPACING + SPACING + SPACING + input.checkpointFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' +
        SPACING + SPACING + SPACING + '}\n' +
        SPACING + '}' +
        '}';

    const builder: RxGraphQLReplicationPullStreamQueryBuilder = (headers: any) => {
        return {
            query,
            variables: {
                headers
            }
        };
    };
    return builder;
}


export function pushQueryBuilderFromRxSchema(
    collectionName: string,
    input: GraphQLSchemaFromRxSchemaInputSingleCollection
): RxGraphQLReplicationPushQueryBuilder {
    input = fillUpOptionals(input);
    const prefixes: Prefixes = input.prefixes as any;

    const ucCollectionName = ucfirst(collectionName);
    const queryName = prefixes.push + ucCollectionName;
    const operationName = ucfirst(queryName);

    const variableName = collectionName + prefixes.pushRow;
    const returnFields = generateGQLOutputFields({ schema: input.schema, spaceCount: 2 })

    const builder: RxGraphQLReplicationPushQueryBuilder = (pushRows) => {
        const query = '' +
            'mutation ' + operationName + '($' + variableName + ': [' + ucCollectionName + 'Input' + prefixes.pushRow + '!]) {\n' +
            SPACING + queryName + '(' + variableName + ': $' + variableName + ') {\n' +
            returnFields + '\n' +
            SPACING + '}\n' +
            '}';

        const sendRows: typeof pushRows = [];
        function transformPushDoc(doc: WithDeleted<any>) {
            const sendDoc: any = {};
            Object.entries(doc).forEach(([k, v]) => {
                if (
                    // skip if in ignoreInputKeys list
                    !(input.ignoreInputKeys as string[]).includes(k) &&
                    // only use properties that are in the schema
                    input.schema.properties[k]
                ) {
                    sendDoc[k] = v;
                }
            });
            return sendDoc;
        }
        pushRows.forEach(pushRow => {
            const newRow: typeof pushRow = {
                newDocumentState: transformPushDoc(pushRow.newDocumentState),
                assumedMasterState: pushRow.assumedMasterState ? transformPushDoc(pushRow.assumedMasterState) : undefined
            };
            sendRows.push(newRow);
        });
        const variables = {
            [variableName]: sendRows
        };
        return {
            query,
            operationName,
            variables
        };
    };

    return builder;
}

type GenerateGQLOutputFieldsOptions = {
    schema: RxJsonSchema<any> | TopLevelProperty,
    spaceCount?: number,
    depth?: number
    ignoreOutputKeys?: string[]
}

function generateGQLOutputFields(options: GenerateGQLOutputFieldsOptions) {
    const { schema, spaceCount = 4, depth = 0, ignoreOutputKeys = [] } = options;

    const outputFields: string[] = [];
    const properties = schema.properties
    const NESTED_SPACING = SPACING.repeat(depth);
    const LINE_SPACING = SPACING.repeat(spaceCount);

    for (const key in properties) {
        //only skipping top level keys that are in ignoreOutputKeys list
        if (ignoreOutputKeys.includes(key)) {
            continue;
        }

        const value = properties[key];
        if (value.type === "array" && value.items) {
            outputFields.push(
                LINE_SPACING + NESTED_SPACING + key + " {",
                generateGQLOutputFields({ schema: value.items, spaceCount, depth: depth + 1 }),
                LINE_SPACING + NESTED_SPACING + "}"
            );
        }
        if (value.type === "object") {
            outputFields.push(
                LINE_SPACING + NESTED_SPACING + key + " {",
                generateGQLOutputFields({ schema: value, spaceCount, depth: depth + 1 }),
                LINE_SPACING + NESTED_SPACING + "}"
            );
        } else {
            outputFields.push(LINE_SPACING + NESTED_SPACING + key);
        }
    }

    return outputFields.join('\n');
}



