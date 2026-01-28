---
title: ReactJS Storage - From Basic LocalStorage to Advanced Offline Apps with RxDB
slug: reactjs-storage.html
description: Discover how to implement reactjs storage using localStorage for quick key-value data, then move on to more robust offline-first approaches with RxDB, IndexedDB, preact signals, encryption plugins, and more.
---

# ReactJS Storage – From Basic LocalStorage to Advanced Offline Apps with RxDB

Modern **ReactJS** applications often need to store data on the client side. Whether you’re preserving simple user preferences or building offline-ready features, choosing the right **storage** mechanism can make or break your development experience. In this guide, we’ll start with a basic **localStorage** approach for minimal data. Then, we’ll explore more powerful, reactive solutions via [RxDB](/)—including offline functionality, indexing, `preact signals`, and even encryption.

---

## Part 1: Storing Data in ReactJS with LocalStorage

`localStorage` is a built-in browser API for storing key-value pairs in the user’s browser. It’s straightforward to set and get items—ideal for trivial preferences or small usage data.

```jsx
import React, { useState, useEffect } from 'react';

function LocalStorageExample() {
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem('username');
    return saved ? JSON.parse(saved) : '';
  });

  useEffect(() => {
    localStorage.setItem('username', JSON.stringify(username));
  }, [username]);

  return (
    <div>
      <h2>ReactJS LocalStorage Demo</h2>
      <input
        type="text"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="Enter your username"
      />
      <p>Stored: {username}</p>
    </div>
  );
}

export default LocalStorageExample;
```

**Pros** of localStorage in ReactJS:

- Easy to implement quickly for minimal data
- Built-in to the browser—no extra libs
- Persistent across sessions

**Downsides of localStorage**
While localStorage is convenient for small amounts of data, it has certain limitations:

- Synchronous: Reading or writing localStorage can block the main thread if data is large.
- No advanced queries: You only store stringified objects by a single key. Searching or filtering requires manually scanning everything.
- No concurrency or offline logic: If multiple tabs or users need to manipulate the same data, localStorage doesn’t handle concurrency or sync with a server.
- No indexing: You can’t perform partial lookups or advanced matching.

For “remember user preference” use cases, localStorage is excellent. But if your app grows complex—needing structured data, large data sets, or offline-first features—you might quickly surpass localStorage’s utility.

## Part 2: LocalStorage vs. IndexedDB

While localStorage is simple, it’s limited to string-based key-value lookups and can be synchronous for all reads/writes. For more robust ReactJS storage needs, browsers also provide IndexedDB—a low-level, asynchronous API that can store larger amounts of JSON data with indexing.

**LocalStorage:**

- Good for small amounts of data (like user settings or flags)
- String-only storage
- Single key-value access, no searching by subfields

**IndexedDB:**

- Stores [large](./indexeddb-max-storage-limit.md) [JSON](./json-database.md) objects, able to index by multiple fields
- Asynchronous and usually more scalable
- More complicated to use directly (i.e., not as simple as .getItem())
[RxDB](/), as you’ll see, simplifies [IndexedDB](../rx-storage-indexeddb.md) usage in ReactJS by adding a more intuitive layer for queries, reactivity, and advanced capabilities like [encryption](../encryption.md).


<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="RxDB" width="250" />
    </a>
</center>

## Part 3: Moving Beyond Basic Storage: RxDB for ReactJS

When data shapes get complex—large sets of nested documents, or you want offline sync to a server—RxDB can transform your approach to ReactJS storage. It stores documents in (usually) IndexedDB or alternative backends but offers a reactive, NoSQL-based interface.

### RxDB Quick Example (Observables)

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

(async function setUpRxDB() {
  const db = await createRxDatabase({
    name: 'heroDB',
    storage: getRxStorageLocalstorage(),
    multiInstance: false
  });

  const heroSchema = {
    title: 'hero schema',
    version: 0,
    type: 'object',
    primaryKey: 'id',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      power: { type: 'string' }
    },
    required: ['id', 'name']
  };

  await db.addCollections({ heroes: { schema: heroSchema } });

  // Insert a doc
  await db.heroes.insert({ id: '1', name: 'AlphaHero', power: 'Lightning' });

  // Query docs once
  const allHeroes = await db.heroes.find().exec();
  console.log('Heroes: ', allHeroes);
})();
```

Reactive Queries: In a React component, you can subscribe to a query via RxDB’s $ property, letting your UI automatically update when data changes. React components can subscribe to updates from .find() queries, letting the UI automatically reflect changes—perfect for dynamic offline-first apps.

```tsx
import React, { useEffect, useState } from 'react';

function HeroList({ collection }) {
  const [heroes, setHeroes] = useState([]);

  useEffect(() => {
    const query = collection.find();
    // query.$ is an RxJS Observable that emits whenever data changes
    const sub = query.$.subscribe(newHeroes => {
      setHeroes(newHeroes);
    });

    return () => sub.unsubscribe(); // clean up subscription
  }, [collection]);

  return (
    <ul>
      {heroes.map(hero => (
        <li key={hero.id}>
          {hero.name} - Power: {hero.power}
        </li>
      ))}
    </ul>
  );
}

export default HeroList;
```

<p align="center">
  <img src="../files/animations/realtime.gif" alt="realtime ui updates" width="700" />
</p>

By using these reactive queries, your React app knows exactly when data changes locally (or from another browser tab) or from remote sync, keeping your UI in sync effortlessly.

## Part 4: Using Preact Signals Instead of Observables

RxDB typically exposes reactivity via RxJS observables. However, some developers prefer newer reactivity approaches like Preact Signals. RxDB supports them via a special plugin or advanced usage:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { PreactSignalsRxReactivityFactory } from 'rxdb/plugins/reactivity-preact-signals';

(async function setUpRxDBWithSignals() {
  const db = await createRxDatabase({
    name: 'heroDB_signals',
    storage: getRxStorageLocalstorage(),
    reactivity: PreactSignalsRxReactivityFactory
  });

  // Create a signal-based query instead of using Observables:
  const collection = db.heroes;
  const heroesSignal = collection.find().$$; // signals version
  // Now you can reference heroesSignal() in Preact or React with adapter usage
})();
```

Preact Signals rely on `signals` instead of `Observables`. Some developers find them more straightforward to adopt, especially for fine-grained reactivity. In ReactJS, you might still prefer RxJS-based subscriptions unless you add bridging code for signals.

## Part 5: Encrypting the Storage with RxDB

For more advanced ReactJS storage needs—especially when sensitive user data is involved - you might want to encrypt stored documents at rest. RxDB provides a robust [encryption plugin](../encryption.md):

```ts
import { createRxDatabase } from 'rxdb';
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

(async function secureSetup() {
  const encryptedStorage = wrappedKeyEncryptionCryptoJsStorage({
    storage: getRxStorageLocalstorage()
  });

  // Provide a password for encryption
  const db = await createRxDatabase({
    name: 'secureReactStorage',
    storage: encryptedStorage,
    password: 'MyStrongPassword123'
  });

  await db.addCollections({
    secrets: {
      schema: {
        title: 'secret schema',
        version: 0,
        type: 'object',
        primaryKey: 'id',
        properties: {
          id: { type: 'string' },
          secretInfo: { type: 'string' }
        },
        required: ['id'],
        encrypted: ['secretInfo'] // field to encrypt
      }
    }
  });
})();
```

All data in the marked `encrypted` fields is automatically encrypted at rest. This is crucial if you store user credentials, private messages, or other personal data in your ReactJS application storage.

## Offline Sync
If you need multi-device or multi-user data synchronization, RxDB provides [replication plugins](../replication.md) for various endpoints (HTTP, [GraphQL](../replication-graphql.md), [CouchDB](../replication-couchdb.md), [Firestore](../replication-firestore.md), etc.). Your [local offline](../offline-first.md) changes can then merge automatically with a remote database whenever internet connectivity is restored.

## Overview: [localStorage vs IndexedDB vs RxDB](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md)

| **Characteristic**       | **localStorage**                                                    | **IndexedDB**                                                                                | **RxDB**                                                                                         |
|--------------------------|---------------------------------------------------------------------|----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| **Data Model**           | Key-value store (only strings)                                      | Low-level, JSON-like storage engine with object stores and indexes                           | NoSQL JSON documents with optional JSON-Schema                                                   |
| **Query Capabilities**   | Basic get/set by key; manual parse for more complex searches        | Index-based queries, but API is fairly verbose; lacks a high-level query language            | JSON-based queries, optional indexes, real-time reactivity                                       |
| **Observability**        | None. Must re-fetch data yourself.                                  | None natively. Must implement eventing or manual re-check.                                   | Built-in reactivity. UI auto-updates via Observables or Preact signals                           |
| **Large Data Usage**     | Not recommended for large data (blocking, synchronous calls)        | Better for large amounts of data, asynchronous reads/writes                                  | Scales for medium to large data. Uses IndexedDB or other storages under the hood                 |
| **Concurrency**          | Minimal. Overwrites if multiple tabs write simultaneously           | Multiple tabs can open the same DB, but must handle concurrency logic carefully              | Multi-instance concurrency with built-in conflict resolution plugins if needed                   |
| **Offline Sync**         | None. Purely local.                                                 | None out of the box. Must be implemented manually                                            | Built-in replication to remote endpoints (HTTP, GraphQL, CouchDB, etc.) for offline-first usage |
| **Encryption**           | Not supported natively                                              | Not supported natively; must encrypt data manually before storing                            | Encryption plugins available. Supports field-level encryption at rest                            |
| **Usage**                | Great for small flags or settings      


## Follow Up

If you’re looking to dive deeper into **ReactJS storage** topics and take full advantage of RxDB’s offline-first, real-time capabilities, here are some recommended resources:

- **[RxDB Official Documentation](../overview.md)**  
  Explore detailed guides on setting up storage adapters, defining [JSON schemas](../rx-schema.md), [handling conflicts](../transactions-conflicts-revisions.md), and enabling [offline synchronization](../replication.md).

- **[RxDB Quickstart](https://rxdb.info/quickstart.html)**  
  Get a step-by-step tutorial to create your first RxDB-based application in minutes.

- **[RxDB GitHub Repository](https://github.com/pubkey/rxdb)**  
  See the source code, open issues, and browse community-driven examples that integrate ReactJS, Preact Signals, and advanced features like encryption.

- **[RxDB Encryption Plugins](https://rxdb.info/encryption.html)**  
  Learn how to encrypt fields in your collections, protecting user data and meeting compliance requirements.

- **[Preact Signals React Integration (Example)](https://github.com/preactjs/signals#react)**  
  If you want to combine React with signals-based reactivity, check out example code and bridging approaches.

- **[MDN: Using the Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)**  
  Refresh on localStorage basics, including best practices for small key-value data in traditional React apps.

With these follow-up steps, you can refine your **reactjs storage** strategy to meet your app’s unique needs, whether it’s simple user preferences or robust offline data syncing.
