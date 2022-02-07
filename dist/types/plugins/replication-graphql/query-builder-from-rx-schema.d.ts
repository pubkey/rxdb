import { GraphQLSchemaFromRxSchemaInputSingleCollection } from './graphql-schema-from-rx-schema';
import type { RxGraphQLReplicationPullQueryBuilder, RxGraphQLReplicationPushQueryBuilder } from '../../types';
export declare function pullQueryBuilderFromRxSchema(collectionName: string, input: GraphQLSchemaFromRxSchemaInputSingleCollection, batchSize: number): RxGraphQLReplicationPullQueryBuilder<any>;
export declare function pushQueryBuilderFromRxSchema(collectionName: string, input: GraphQLSchemaFromRxSchemaInputSingleCollection): RxGraphQLReplicationPushQueryBuilder;
