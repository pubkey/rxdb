import assert from 'assert';
import {
    RxDBServerGraphQLPlugin
} from '../../plugins/server-graphql';
import * as humansCollection from '../helper/humans-collection';
import {
    addRxPlugin
} from '../../';
import { getPort } from '../helper/graphql-server';
addRxPlugin(RxDBServerGraphQLPlugin);

describe('server-graphql.test.ts', () => {

    it('should be able to create and close a server', async () => {


        console.log('################');
        console.log('################');
        console.log('################');

        const collection = await humansCollection.createHumanWithTimestamp(0);
        const serverState = await collection.database.serverGraphQL({
            path: 'endpoint',
            port: getPort(),
            checkpointFields: [
                collection.schema.primaryPath,
                'lwt'
            ]
        });
        assert.ok(serverState);
        await collection.database.destroy();
    });

});
