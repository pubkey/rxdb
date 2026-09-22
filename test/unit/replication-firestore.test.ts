import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getRootPath } from './config.ts';
import { isNode } from '../../plugins/test-utils/index.mjs';

describe('replication-firestore cached pulls', () => {
    if (!isNode) return;

    for (const scenario of ['initial', 'newer', 'same-time', 'non-live', 'cancel']) {
        const title = scenario === 'cancel' ? 'must stop cached pull retries after cancellation' :
            'must preserve checkpoints for cached ' + scenario + ' queries and retry online';
        it(title, async () => {
            await promisify(execFile)(process.execPath, [
                '--experimental-test-module-mocks',
                getRootPath() + 'test_tmp/helper/firestore-cached-pull.node.js',
                scenario
            ], { timeout: 10000 });
        });
    }
});
