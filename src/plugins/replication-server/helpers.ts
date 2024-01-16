import { newRxError } from '../../rx-error.ts';
import type { RxServerReplicationState } from './index.ts';

export async function parseResponse(
    replicationState: RxServerReplicationState<any>,
    fetchResponse: Response
) {
    if (fetchResponse.status === 426) {
        replicationState.outdatedClient$.next();
        throw newRxError('RC_OUTDATED', {
            url: fetchResponse.url
        });
    }
    const data = await fetchResponse.json();

    if (data.error) {
        // TODO
        console.log('TODO handle parseResponse error');
        throw data;
    }

    return data;
}
