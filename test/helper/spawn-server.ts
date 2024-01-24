import { randomString } from 'async-test-util';
import { PROMISE_RESOLVE_VOID } from '../../plugins/core/index.mjs';
import { getFetchWithCouchDBAuthorization } from '../../plugins/replication-couchdb/index.mjs';
import {
    ENV_VARIABLES
} from '../../plugins/test-utils/index.mjs';

/**
 * Spawns a CouchDB server
 */
export async function spawn(
    databaseName = randomString(5),
    port?: number
): Promise<{
    dbName: string;
    url: string;
    close: () => Promise<void>;
}> {
    if (!ENV_VARIABLES.NATIVE_COUCHDB) {
        throw new Error('ENV_VARIABLES.NATIVE_COUCHDB not set. A CouchDB server must be started');
    }

    if (port) {
        throw new Error('if NATIVE_COUCHDB is set, do not specify a port');
    }
    port = parseInt(ENV_VARIABLES.NATIVE_COUCHDB, 10);
    const url = 'http://0.0.0.0:' + port + '/' + databaseName + '/';

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000);
    const authFetch = getFetchWithCouchDBAuthorization('root', 'root');
    await authFetch(
        url,
        {
            method: 'PUT',
            signal: controller.signal
        }
    );
    return {
        dbName: databaseName,
        url,
        close: () => PROMISE_RESOLVE_VOID
    };
}
