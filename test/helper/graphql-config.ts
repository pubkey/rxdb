export const GRAPHQL_PATH = '/graphql';
export const GRAPHQL_SUBSCRIPTION_PATH = '/subscriptions';

export async function getDocsOnServer(
    replicationState: any
): Promise<any[]> {
    const response = await replicationState.client.query(`{
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
