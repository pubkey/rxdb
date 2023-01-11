/**
 * When you create your own implementation of the RxStorage interface,
 * you can run the whole unit test suite over your custom storage.
 * Therefore do the following steps:
 * - clone the whole rxdb repository
 * - replace this file (custom-storage.ts) with a file that exports your values of RxTestStorage
 * - Run 'npm run transpile && cross-env DEFAULT_STORAGE=dexie NODE_ENV=fast mocha --config ./config/.mocharc.cjs ./test_tmp/unit.test.js'
 */
import type { RxTestStorage } from '../../';
export const CUSTOM_STORAGE: RxTestStorage = {} as any;
