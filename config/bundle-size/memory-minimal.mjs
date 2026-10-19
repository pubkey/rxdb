/**
 * The smallest possible RxDB app:
 * a database with the memory storage and nothing else.
 */
import { createRxDatabase } from '../../plugins/core/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';

const db = await createRxDatabase({
    name: 'bundlesize',
    storage: getRxStorageMemory()
});
await db.close();
