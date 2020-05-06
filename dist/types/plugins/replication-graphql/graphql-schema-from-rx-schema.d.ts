import { RxJsonSchema } from '../../types';
export declare type Prefixes = {
    set?: string;
    feed?: string;
    changed?: string;
};
export declare type GraphQLSchemaFromRxSchemaInputSingleCollection = {
    schema: RxJsonSchema;
    deletedFlag: string;
    feedKeys: string[];
    ignoreInputKeys?: string[];
    ignoreOutputKeys?: string[];
    withRevisions?: boolean;
    prefixes?: Prefixes;
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
 * TODO this is in beta mode,
 * use it at your own risk.
 * Fix bugs when you find them.
 */
export declare function graphQLSchemaFromRxSchema(input: GraphQLSchemaFromRxSchemaInput): GraphQLSchemaFromRxSchemaOutput;
export declare function fillUpOptionals(input: GraphQLSchemaFromRxSchemaInputSingleCollection): GraphQLSchemaFromRxSchemaInputSingleCollection;
