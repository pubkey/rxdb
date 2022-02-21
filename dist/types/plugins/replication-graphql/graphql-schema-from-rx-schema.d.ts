import { RxJsonSchema } from '../../types';
export declare type Prefixes = {
    set?: string;
    feed?: string;
    changed?: string;
};
/**
 * just type some common types
 * to have better IDE autocomplete,
 * all strings are allowed
 */
export declare type GraphQLParamType = 'ID' | 'ID!' | 'String' | 'String!' | 'Int' | 'Int!' | string;
export declare type GraphQLSchemaFromRxSchemaInputSingleCollection = {
    schema: RxJsonSchema<any>;
    deletedFlag: string;
    feedKeys: string[];
    ignoreInputKeys?: string[];
    ignoreOutputKeys?: string[];
    withRevisions?: boolean;
    prefixes?: Prefixes;
    subscriptionParams?: {
        [k: string]: GraphQLParamType;
    };
};
export declare type GraphQLSchemaFromRxSchemaInput = {
    [collectionName: string]: GraphQLSchemaFromRxSchemaInputSingleCollection;
};
export declare type GraphQLSchemaFromRxSchemaOutput = {
    asString: string;
    queries: string[];
    mutations: string[];
    subscriptions: string[];
    inputs: string[];
    types: string[];
};
export declare const SPACING = "  ";
/**
 * Create a GraphQL schema from a given RxJsonSchema
 */
export declare function graphQLSchemaFromRxSchema(input: GraphQLSchemaFromRxSchemaInput): GraphQLSchemaFromRxSchemaOutput;
export declare function fillUpOptionals(input: GraphQLSchemaFromRxSchemaInputSingleCollection): GraphQLSchemaFromRxSchemaInputSingleCollection;
