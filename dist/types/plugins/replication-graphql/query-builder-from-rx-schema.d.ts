import { GraphQLSchemaFromRxSchemaInputSingleCollection } from './graphql-schema-from-rx-schema';
import { RxGraphQLReplicationQueryBuilder } from '../../types';
export declare function pullQueryBuilderFromRxSchema(collectionName: string, input: GraphQLSchemaFromRxSchemaInputSingleCollection, batchSize?: number): RxGraphQLReplicationQueryBuilder;
export declare function pushQueryBuilderFromRxSchema(collectionName: string, input: GraphQLSchemaFromRxSchemaInputSingleCollection): RxGraphQLReplicationQueryBuilder;
