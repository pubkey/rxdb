import { GraphQLSchemaFromRxSchemaInputSingleCollection } from './graphql-schema-from-rx-schema.ts';
import type { RxGraphQLReplicationPullQueryBuilder, RxGraphQLReplicationPullStreamQueryBuilder, RxGraphQLReplicationPushQueryBuilder } from '../../types/index.d.ts';
export declare function pullQueryBuilderFromRxSchema(collectionName: string, input: GraphQLSchemaFromRxSchemaInputSingleCollection): RxGraphQLReplicationPullQueryBuilder<any>;
export declare function pullStreamBuilderFromRxSchema(collectionName: string, input: GraphQLSchemaFromRxSchemaInputSingleCollection): RxGraphQLReplicationPullStreamQueryBuilder;
export declare function pushQueryBuilderFromRxSchema(collectionName: string, input: GraphQLSchemaFromRxSchemaInputSingleCollection): RxGraphQLReplicationPushQueryBuilder;
