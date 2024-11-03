import { waitUntil } from 'async-test-util';
import { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';

import {
    createRxDatabase,
    randomCouchString,
    RxCollection
} from '../../plugins/core/index.mjs';

import {
    getRxStorageMemory,
    RxStorageInstanceMemory
} from '../../plugins/storage-memory/index.mjs';


describeParallel('conflict-handling.test.js', () => {
    describe('RxStorageInterface', () => {
    });
});
