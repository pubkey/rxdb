import { getGraphqlSchemaFromJsonSchema } from 'get-graphql-from-jsonschema';

import { fillWithDefaultSettings } from '../../rx-schema-helper.ts';

import type { RxJsonSchema } from '../../types/index.d.ts';
import { clone, ensureNotFalsy, flatClone, ucfirst } from '../../plugins/utils/index.ts';

export type Prefixes = {
    push?: string;
    pushRow?: string;
    checkpoint?: string;
    pull?: string;
    pullBulk?: string;
    stream?: string;
    headers?: string;
};

/**
 * just type some common types
 * to have better IDE autocomplete,
 * all strings are allowed
 */
export type GraphQLParamType = 'ID' | 'ID!' |
    'String' | 'String!' |
    'Int' | 'Int!' |
    'Float' | 'Float!' |
    string;

export type GraphQLSchemaFromRxSchemaInputSingleCollection = {
    schema: RxJsonSchema<any>;
    /**
     * These fields of the document data
     * will be used for the checkpoint.
     */
    checkpointFields: string[];
    ignoreInputKeys?: string[];
    ignoreOutputKeys?: string[];
    withRevisions?: boolean;
    prefixes?: Prefixes;
    headerFields?: string[];
    /**
     * Name of the boolean field that marks deleted documents.
     * [default='_deleted']
     */
    deletedField?: string;
};

export type GraphQLSchemaFromRxSchemaInput = {
    [collectionName: string]: GraphQLSchemaFromRxSchemaInputSingleCollection;
};
export type GraphQLSchemaFromRxSchemaOutput = {
    asString: string;
    queries: string[];
    mutations: string[];
    subscriptions: string[];
    inputs: string[];
    types: string[];
};

// we use two spaces because get-graphql-from-jsonschema does also
export const SPACING = '  ';

/**
 * Create a GraphQL schema from a given RxJsonSchema
 */
export function graphQLSchemaFromRxSchema(
    input: GraphQLSchemaFromRxSchemaInput
): GraphQLSchemaFromRxSchemaOutput {
    const ret: GraphQLSchemaFromRxSchemaOutput = {
        asString: '',
        queries: [],
        mutations: [],
        subscriptions: [],
        inputs: [],
        types: []
    };

    Object.entries(input).forEach(([collectionName, collectionSettings]) => {
        collectionSettings = fillUpOptionals(collectionSettings);

        const schema = collectionSettings.schema;
        const prefixes: Prefixes = ensureNotFalsy(collectionSettings.prefixes);
        const ucCollectionName = ucfirst(collectionName);
        const collectionNameInput = ucfirst(collectionName) + 'Input';

        // input
        const inputSchema = stripKeysFromSchema(schema, ensureNotFalsy(collectionSettings.ignoreInputKeys));

        const inputGraphQL = getGraphqlSchemaFromJsonSchema({
            rootName: collectionNameInput,
            schema: inputSchema as any,
            direction: 'input'
        });
        const pushRowGraphQL = getGraphqlSchemaFromJsonSchema({
            rootName: collectionNameInput + prefixes.pushRow,
            schema: {
                type: 'object',
                properties: {
                    assumedMasterState: inputSchema as any,
                    newDocumentState: inputSchema as any
                },
                required: ['newDocumentState'],
                additionalProperties: false
            },
            direction: 'input'
        });

        const checkpointSchema = {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false
        } as any;
        collectionSettings.checkpointFields.forEach(key => {
            const subSchema: any = schema.properties[key];
            checkpointSchema.properties[key] = subSchema;
            checkpointSchema.required.push(key);
        });
        const checkpointInputGraphQL = getGraphqlSchemaFromJsonSchema({
            rootName: collectionNameInput + prefixes.checkpoint,
            schema: checkpointSchema as any,
            direction: 'input'
        });

        ret.inputs = ret.inputs.concat(
            inputGraphQL
                .typeDefinitions
                .map(str => replaceTopLevelTypeName(str, collectionNameInput))
        ).concat(
            pushRowGraphQL
                .typeDefinitions
                .map(str => replaceTopLevelTypeName(str, collectionNameInput + prefixes.pushRow))
        ).concat(
            checkpointInputGraphQL
                .typeDefinitions
                .map(str => replaceTopLevelTypeName(str, collectionNameInput + prefixes.checkpoint))
        );

        const headersSchema: any = {
            type: 'object',
            additionalProperties: false,
            properties: {},
            required: []
        };
        ensureNotFalsy(collectionSettings.headerFields).forEach(headerField => {
            headersSchema.properties[headerField] = {
                type: 'string'
            };
            headersSchema.required.push(headerField);
        });
        const headersInputName = collectionNameInput + prefixes.headers;
        const headersInputGraphQL = getGraphqlSchemaFromJsonSchema({
            rootName: headersInputName,
            schema: headersSchema,
            direction: 'input'
        });
        if (ensureNotFalsy(collectionSettings.headerFields).length > 0) {
            ret.inputs = ret.inputs.concat(
                headersInputGraphQL
                    .typeDefinitions
                    .map(str => replaceTopLevelTypeName(str, headersInputName))
            );
        }

        // output
        const outputSchema = stripKeysFromSchema(schema, ensureNotFalsy(collectionSettings.ignoreOutputKeys));
        const outputGraphQL = getGraphqlSchemaFromJsonSchema({
            rootName: collectionName,
            schema: outputSchema as any,
            direction: 'output'
        });
        const checkpointOutputGraphQL = getGraphqlSchemaFromJsonSchema({
            rootName: ucCollectionName + prefixes.checkpoint,
            schema: checkpointSchema as any,
            direction: 'output'
        });
        const pullBulkOutputGraphQL = getGraphqlSchemaFromJsonSchema({
            rootName: ucCollectionName + prefixes.pullBulk,
            schema: {
                type: 'object',
                properties: {
                    documents: {
                        type: 'array',
                        items: inputSchema as any
                    },
                    checkpoint: checkpointSchema as any
                },
                required: ['documents', 'checkpoint'],
                additionalProperties: false
            },
            direction: 'output'
        });
        ret.types = ret.types.concat(
            outputGraphQL.typeDefinitions
                .map(str => replaceTopLevelTypeName(str, ucCollectionName))
        ).concat(
            checkpointOutputGraphQL.typeDefinitions
                .map(str => replaceTopLevelTypeName(str, ucCollectionName + prefixes.checkpoint))
        ).concat(
            pullBulkOutputGraphQL.typeDefinitions
                .map(str => replaceTopLevelTypeName(str, ucCollectionName + prefixes.pullBulk))
        );

        // query
        const queryName = prefixes.pull + ucCollectionName;
        const queryKeys = [
            'checkpoint: ' + collectionNameInput + prefixes.checkpoint,
            'limit: Int!'
        ];
        const queryString = queryName + '(' + queryKeys.join(', ') + '): ' + ucCollectionName + prefixes.pullBulk + '!';
        ret.queries.push(SPACING + queryString);

        // mutation
        const mutationName = prefixes.push + ucCollectionName;
        const mutationString = mutationName + '(' + collectionName + prefixes.pushRow + ': [' + collectionNameInput + prefixes.pushRow + ']): [' + ucCollectionName + '!]!';
        ret.mutations.push(SPACING + mutationString);

        // subscription
        let subscriptionHeaderInputString = '';
        if (collectionSettings.headerFields && collectionSettings.headerFields.length > 0) {
            subscriptionHeaderInputString = '(headers: ' + headersInputName + ')';
        }
        const subscriptionName = prefixes.stream + ucCollectionName;
        const subscriptionString = subscriptionName + subscriptionHeaderInputString + ': ' + ucCollectionName + prefixes.pullBulk + '!';
        ret.subscriptions.push(SPACING + subscriptionString);
    });

    // build full string
    const fullQueryString = 'type Query {\n' + ret.queries.join('\n') + '\n}\n';
    const fullMutationString = 'type Mutation {\n' + ret.mutations.join('\n') + '\n}\n';
    const fullSubscriptionString = 'type Subscription {\n' + ret.subscriptions.join('\n') + '\n}\n';

    const fullTypeString = ret.types.join('\n');
    const fullInputString = ret.inputs.join('\n');

    const fullSchemaString = '' +
        'schema {\n' +
        SPACING + 'query: Query\n' +
        SPACING + 'mutation: Mutation\n' +
        SPACING + 'subscription: Subscription\n' +
        '}\n';

    ret.asString = '' +
        fullQueryString + '\n' +
        fullMutationString + '\n' +
        fullSubscriptionString + '\n' +
        fullTypeString + '\n' +
        fullInputString + '\n' +
        fullSchemaString;

    return ret;
}


export function fillUpOptionals(
    input: GraphQLSchemaFromRxSchemaInputSingleCollection
): GraphQLSchemaFromRxSchemaInputSingleCollection {
    input = flatClone(input);

    const schema = fillWithDefaultSettings(input.schema);
    // strip internal attributes
    Object.keys(schema.properties).forEach(key => {
        if (key.startsWith('_')) {
            delete schema.properties[key];
        }
    });
    input.schema = schema;

    // add deleted field to schema
    if (!input.deletedField) {
        input.deletedField = '_deleted';
    }
    schema.properties[input.deletedField] = {
        type: 'boolean'
    };
    (schema.required as string[]).push(input.deletedField);

    // fill up prefixes
    if (!input.prefixes) {
        input.prefixes = {} as any;
    }
    const prefixes: Prefixes = input.prefixes as any;
    if (!prefixes.push) {
        prefixes.push = 'push';
    }
    if (!prefixes.pushRow) {
        prefixes.pushRow = 'PushRow';
    }
    if (!prefixes.checkpoint) {
        prefixes.checkpoint = 'Checkpoint';
    }
    if (!prefixes.pull) {
        prefixes.pull = 'pull';
    }
    if (!prefixes.pullBulk) {
        prefixes.pullBulk = 'PullBulk';
    }
    if (!prefixes.stream) {
        prefixes.stream = 'stream';
    }
    if (!prefixes.headers) {
        prefixes.headers = 'Headers';
    }
    if (!input.headerFields) {
        input.headerFields = [];
    }


    if (!input.withRevisions) {
        input.withRevisions = false;
    }

    if (!input.ignoreInputKeys) {
        input.ignoreInputKeys = [];
    }
    if (!input.ignoreOutputKeys) {
        input.ignoreOutputKeys = [];
    }

    return input;
}

function stripKeysFromSchema<T>(schema: RxJsonSchema<T>, strip: string[]): RxJsonSchema<Partial<T>> {
    const cloned: any = clone(schema);
    strip.forEach(key => {
        delete cloned.properties[key];
    });
    return cloned;
}

/**
 * get-graphql-from-jsonschema add a T0-suffix
 * that we do not want for the top level type
 */
function replaceTopLevelTypeName(str: string, ucCollectionName: string): string {
    return str.replace(' ' + ucCollectionName + 'T0 ', ' ' + ucCollectionName + ' ');
}
