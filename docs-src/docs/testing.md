# Testing

Writing tests for your RxDB application is crucial to ensure reliability. Because RxDB runs in many different environments (Browser, [Node.js](nodejs-database.md), [React Native](react-native-database.md), [Electron](electron-database.md), ...), testing strategies might vary. However, there are some common patterns that make testing easier and faster.

## Use the `memory` RxStorage

For unit tests, you should generally use the [`memory` RxStorage](rx-storage-memory.md). It keeps data only in memory, which has several advantages:
- **Speed**: It is much faster than writing to disc.
- **Isolation**: Each test run starts with a clean state; you don't have to delete database files between tests.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';

const db = await createRxDatabase({
    name: 'test-db',
    storage: getRxStorageMemory()
});
```

## The `using` Keyword

RxDB supports the [Explicit Resource Management](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management) `using` keyword (available in TypeScript 5.2+). This automatically closes the database when the variable goes out of scope, which is perfect for tests.

Instead of manually calling `await db.close()`, you can do:

```ts
describe('my test suite', () => {
    it('should insert a document', async () => {
        // Did you know? 
        // using 'using' ensures db.close() is called automatically 
        // at the end of the test function.
        await using db = await createRxDatabase({
            name: 'test-db',
            storage: getRxStorageMemory()
        });
        
        await db.addCollections({ ... });
        // ... run your tests
    });
});
```

## Cleanup

When running many tests, it is important to ensure that all databases are cleaned up after your tests run. Having non-closed `RxDatabase` instances after some tests can significantly decrease performance because background tasks and event listeners are still active.

A good practice is to verify that no database instances or connections are left open. You can check internal RxDB states to ensure everything is closed.

```ts
import { dbCount } from 'rxdb/plugins/core';
import assert from 'assert';

describe('cleanup', () => {
    it('ensure every db is cleaned up', () => {
        assert.strictEqual(dbCount(), 0);
    });
});
```

## Multi-Tab Simulation

To test multi-tab behavior (like [Leader Election](leader-election.md) or [Replication](replication.md)) within a single Node.js process or test runner, you can create multiple [`RxDatabase`](rx-database.md) instances with the **same name** and storage. RxDB will treat them as if they were running in different tabs or processes. Notice that for this, [ignoreDuplicate](./rx-database.md#ignoreduplicate) must be set to `true` because otherwise it will not allow to create multiple databases with the same name in a single JavaScript process.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';

// Simulate Tab 1
const db1 = await createRxDatabase({
    name: 'test-db', // same name
    storage: getRxStorageMemory(),
    ignoreDuplicate: true // must be set to true
});

// Simulate Tab 2
const db2 = await createRxDatabase({
    name: 'test-db', // same name
    storage: getRxStorageMemory(),
    ignoreDuplicate: true // must be set to true
});

await db1.addCollections({ ... });
await db2.addCollections({ ... });

// valid because both point to the same storage state
assert.strictEqual(db1.storage, db2.storage); 
```

This works because the `memory` storage (and others) are shared within the same JavaScript process.
