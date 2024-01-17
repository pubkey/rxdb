import { newRxError } from '../../rx-error.ts';
import { nextTick } from '../utils/index.ts';
import type { RxServerReplicationState } from './index.ts';

export async function parseResponse(
    replicationState: RxServerReplicationState<any>,
    fetchResponse: Response
) {
    if (fetchResponse.status === 426) {
        replicationState.outdatedClient$.next();
        nextTick().then(() => replicationState.cancel());
        throw newRxError('RC_OUTDATED', {
            url: fetchResponse.url
        });
    }
    if (fetchResponse.status === 401) {
        replicationState.unauthorized$.next();
        throw newRxError('RC_UNAUTHORIZED', {
            url: fetchResponse.url
        });
    }
    if (fetchResponse.status === 403) {
        replicationState.forbidden$.next();
        nextTick().then(() => replicationState.cancel());
        throw newRxError('RC_FORBIDDEN', {
            url: fetchResponse.url
        });
    }
    const data = await fetchResponse.json();

    if (data.error) {
        // TODO
        console.log('TODO handle parseResponse error');
        console.dir(data);
        throw data;
    }

    return data;
}
