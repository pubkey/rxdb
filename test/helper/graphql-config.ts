import { RxGraphQLReplicationState } from '../../plugins/replication-graphql';

export const GRAPHQL_PATH = '/graphql';
export const GRAPHQL_SUBSCRIPTION_PATH = '/subscriptions';

export async function getDocsOnServer<RxDocType>(
    replicationState: RxGraphQLReplicationState<RxDocType, any>
): Promise<RxDocType[]> {
    const response = await replicationState.clientState.client.query(`{
        getAll {
            id
            name
            age
            updatedAt
            deleted
        }
    }`);
    return response.data.getAll;
}
