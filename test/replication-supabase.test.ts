import assert from 'assert';

import {
    randomToken,
    ensureNotFalsy,
    addRxPlugin,
    RxCollection
} from '../plugins/core/index.mjs';
import {
    lastOfArray
} from '../plugins/utils/index.mjs';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    ensureCollectionsHaveEqualState,
    SimpleHumanDocumentType
} from '../plugins/test-utils/index.mjs';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
import config from './unit/config.ts';
import { randomString, wait, waitUntil } from 'async-test-util';
import {
    RxSupabaseReplicationState,
    replicateSupabase
} from '../plugins/replication-supabase/index.mjs';


describe('replication-supabase.test.ts', function () {
    addRxPlugin(RxDBDevModePlugin);
});
