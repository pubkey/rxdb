import { getGraphqlFromJsonSchema } from 'get-graphql-from-jsonschema';

import { scalarTypes } from 'get-graphql-from-jsonschema/build/lib/scalarTypes';

import { RxJsonSchema } from '../../types';
import { fillWithDefaultSettings } from '../../rx-schema';
import { clone, ucfirst } from '../../util';

export type Prefixes = {
    set?: string;
    feed?: string;
    changed?: string;
};

/**
 * just type some common types
 * to have better IDE autocomplete,
 * all strings are allowed
 */
export type GraphQLParamType = 'ID' | 'ID!' | 'String' | 'String!' | 'Int' | 'Int!' | string;

export type GraphQLSchemaFromRxSchemaInputSingleCollection = {
    schema: RxJsonSchema;
    deletedFlag: string;
    // which keys must be send to the feed-query to get the newer documents?
    feedKeys: string[];
    ignoreInputKeys?: string[];
    ignoreOutputKeys?: string[];
    withRevisions?: boolean;
    prefixes?: Prefixes;
    subscriptionParams?: { [k: string]: GraphQLParamType }
};

export type GraphQLSchemaFromRxSchemaInput = {
    [collectionName: string]: GraphQLSchemaFromRxSchemaInputSingleCollection
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
 * TODO this is in beta mode,
 * use it at your own risk.
 * Fix bugs when you find them.
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
        const prefixes: Prefixes = collectionSettings.prefixes as any;
        const ucCollectionName = ucfirst(collectionName);
        const collectionNameInput = ucfirst(collectionName) + 'Input';

        // input
        const inputSchema = stripKeysFromSchema(schema, collectionSettings.ignoreInputKeys as string[]);
        const inputGraphQL = getGraphqlFromJsonSchema({
            rootName: collectionNameInput,
            schema: inputSchema as any,
            direction: 'input'
        });
        ret.inputs = ret.inputs.concat(
            inputGraphQL
                .typeDefinitions
                .map(str => replaceTopLevelTypeName(str, collectionNameInput))
        );

        // output
        const outputSchema = stripKeysFromSchema(schema, collectionSettings.ignoreOutputKeys as string[]);
        const outputGraphQL = getGraphqlFromJsonSchema({
            rootName: collectionName,
            schema: outputSchema as any,
            direction: 'output'
        });
        ret.types = ret.types.concat(
            outputGraphQL.typeDefinitions
                .map(str => replaceTopLevelTypeName(str, ucCollectionName))
        );

        // query
        const queryName = prefixes.feed + ucCollectionName;
        const queryKeys = collectionSettings.feedKeys.map(key => {
            const subSchema: any = schema.properties[key];
            const graphqlType = scalarTypes[subSchema.type];
            const keyString = key + ': ' + graphqlType + '';
            return keyString;
        });
        queryKeys.push('limit: Int!');
        const queryString = queryName + '(' + queryKeys.join(', ') + '): [' + ucCollectionName + '!]!';
        ret.queries.push(SPACING + queryString);

        // mutation
        const mutationName = prefixes.set + ucCollectionName;
        const mutationString = mutationName + '(' + collectionName + ': ' + collectionNameInput + '): ' + ucCollectionName;
        ret.mutations.push(SPACING + mutationString);

        // subscription
        let subscriptionParamsString = '';
        if (collectionSettings.subscriptionParams && Object.keys(collectionSettings.subscriptionParams).length > 0) {
            subscriptionParamsString = '(' +
                Object
                    .entries(collectionSettings.subscriptionParams)
                    .map(([name, type]) => name + ': ' + type)
                    .join(', ') +
                ')';
        }
        const subscriptionName = prefixes.changed + ucCollectionName;
        const subscriptionString = subscriptionName + subscriptionParamsString + ': ' + ucCollectionName;
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

    const schema = fillWithDefaultSettings(input.schema);
    // strip internal attributes
    Object.keys(schema.properties).forEach(key => {
        if (key.startsWith('_')) {
            delete schema.properties[key];
        }
    });
    input.schema = schema;

    // add deleted flag to schema
    schema.properties[input.deletedFlag] = {
        type: 'boolean'
    };
    (schema.required as string[]).push(input.deletedFlag);

    // fill up prefixes
    if (!input.prefixes) {
        input.prefixes = {} as any;
    }
    const prefixes: Prefixes = input.prefixes as any;
    if (!prefixes.set) {
        prefixes.set = 'set';
    }
    if (!prefixes.feed) {
        prefixes.feed = 'feed';
    }
    if (!prefixes.changed) {
        prefixes.changed = 'changed';
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

function stripKeysFromSchema(schema: RxJsonSchema, strip: string[]): RxJsonSchema {
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
