import { RxJsonSchema } from '../../types';
export declare type Prefixes = {
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
export declare type GraphQLParamType = 'ID' | 'ID!' | 'String' | 'String!' | 'Int' | 'Int!' | 'Float' | 'Float!' | string;
export declare type GraphQLSchemaFromRxSchemaInputSingleCollection = {
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
