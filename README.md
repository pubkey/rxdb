<!--
| Announcement                                                        |
| :--: |
| &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; Version **12.0.0** is now released, read the [ANNOUNCEMENT](./orga/releases/12.0.0.md) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp; |
-->


<br />
<br />
<br />

<!--
| Announcement                                                        |
| :--: |
| Please take part in the [RxDB user survey 2022](https://forms.gle/oxVToPJb6yGHkkMi7). This will help me to better plan the steps for the next major release. (takes about 2 minutes)
-->


<p align="center">
  <a href="https://rxdb.info/">
    <img src="./docs-src/files/logo/logo_text.svg" width="380px" />
  </a>
  <br />
  <br />
  <h3 align="center">A fast, offline-first, reactive database for JavaScript Applications</h3>
</p>


<p align="center">
    <a href="https://github.com/pubkey/rxdb/releases"><img src="https://img.shields.io/github/v/release/pubkey/rxdb?color=%23ff00a0&include_prereleases&label=version&sort=semver&style=flat-square"></a>
    &nbsp;
    <a href="https://github.com/pubkey/rxdb"><img src="https://img.shields.io/npm/types/rxdb?style=flat-square"></a>
    &nbsp;
    <a href="https://github.com/pubkey/rxdb/blob/master/LICENSE.txt"><img src="https://img.shields.io/github/license/pubkey/rxdb?style=flat-square"></a>
    &nbsp;
    <a href="https://github.com/pubkey/rxdb/stargazers"><img src="https://img.shields.io/github/stars/pubkey/rxdb?color=f6f8fa&style=flat-square"></a>
    &nbsp;
    <a href="https://www.npmjs.com/package/rxdb"><img src="https://img.shields.io/npm/dm/rxdb?color=c63a3b&style=flat-square"></a>
    &nbsp;
 	  <a href="https://discord.gg/tqt9ZttJfD"><img src="https://img.shields.io/discord/969553741705539624?label=discord&style=flat-square&color=5a66f6"></a>
	  &nbsp;
    <a href="https://twitter.com/intent/follow?screen_name=rxdbjs"><img src="https://img.shields.io/twitter/follow/rxdbjs?color=1DA1F2&label=twitter&style=flat-square"></a>
    &nbsp;
    <a href="https://www.getrevue.co/profile/rxdbjs/"><img src="https://img.shields.io/badge/newsletter-subscribe-e05b29?style=flat-square"></a>
</p>


<br />

<h2>
  <img height="24" width="24" src="./docs-src/files/logo/logo.svg">&nbsp;&nbsp;What is RxDB?
</h2>


<p align="justify">
  RxDB (short for <b>R</b>eactive <b>D</b>ata<b>b</b>ase) is an <a href="https://rxdb.info/offline-first.html">offline-first</a>, NoSQL-database for JavaScript Applications like Websites, hybrid Apps, Electron-Apps, Progressive Web Apps and Node.js.
  Reactive means that you can not only query the current state, but <b>subscribe</b> to all state changes like the result of a query or even a single field of a document.
  This is great for UI-based <b>realtime</b> applications in way that makes it easy to develop and also has great performance benefits but can also be used to create fast backends in Node.js.<br />
  RxDB provides an easy to implement <a href="https://rxdb.info/replication.html">protocol</a> for realtime <b>replication</b> with your existing infrastructure or any compliant CouchDB endpoint.<br />
  RxDB is based on a storage interface that enables you to swap out the underlaying storage engine. This increases <b>code reuse</b> because you can use the same database code for different JavaScript environments by just switching out the storage settings.
</p>

Use the [quickstart](https://rxdb.info/quickstart.html), read the [documentation](https://rxdb.info/install.html) or explore the [example projects](https://github.com/pubkey/rxdb/tree/master/examples).


<br/>


![reactive.gif](docs-src/files/realtime.gif)


* * *


|     | **Features**                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 💻📱  | **Multiplatform support** for browsers, nodejs, electron, cordova, react-native and every other JavaScript-runtime                                                                                                                      |
| 📨 | **Reactive** data-handling based on [RxJS](https://github.com/ReactiveX/rxjs)                                                                                                                                                           |
| 🚣 | Follows the [offline first paradigm](https://rxdb.info/offline-first.html) which lets your app still work when users are offline                                          
| 🔄  | Realtime **replication** between client and server-data with a protocol that is easy to implement with your existing infrastructure. |
| 📄  | **Schema-based** with the easy-to-learn standard of [json-schema](https://json-schema.org/)                                                                                                                                                                        |
| 🍊  | **Mango-Query** exactly like you know from mongoDB and other NoSQL databases  <!-- IMPORTANT: It is really called 'mango' query, do not make a PR to fix this 'typo' https://github.com/cloudant/mango -->                                                                                                                    |
| 🔐  | **Encryption** of single data-fields to protect your users data                                                                                                                                                                         |
| 📤📥  | **Import/Export** of the database-state (json), awesome for coding with [TDD](https://en.wikipedia.org/wiki/Test-driven_development)                                                                                                    |
| 📡  | **Multi-Window** to synchronise data between different browser-tabs or nodejs-processes                                                                                                                                              |
| 💅 | **ORM-capabilities** to easily handle data-code-relations and customize functions of documents and collections                                                                                                                                                                               |
| 🔷  | Full **TypeScript** support for fast and secure coding (Requires Typescript v3.8 or higher)                                                                                                                                             |

## Flexible Storage layer

RxDB is based on the [RxStorage layer](https://rxdb.info/rx-storage.html), so that you can use **reuse the same code** at different JavaScript runtimes like:

![Chrome](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/39.2.2/chrome/chrome_24x24.png) ![Firefox](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/39.2.2/firefox/firefox_24x24.png)
    ![Safari](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/39.2.2/safari/safari_24x24.png)
    ![Edge](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/39.2.2/edge/edge_24x24.png)
    ![Internet Explorer 11](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/39.2.2/archive/internet-explorer_9-11/internet-explorer_9-11_24x24.png) Browsers,
![NodeJS](docs-src/files/icons/nodejs.png) [NodeJS](https://github.com/pubkey/rxdb/tree/master/examples/node),
![electron](docs-src/files/icons/electron.png) [Electron](https://github.com/pubkey/rxdb/tree/master/examples/electron),
![react-native](docs-src/files/icons/react-native.png) [React-Native](https://github.com/pubkey/rxdb/tree/master/examples/react-native),
![cordova](docs-src/files/icons/cordova.png) [Cordova / Phonegap](https://cordova.apache.org/)
or [Capacitor](https://capacitorjs.com/)

We optimized, double-checked and made boilerplates so you can directly start to use RxDB with frameworks like

   ![angular](docs-src/files/icons/angular.png) [Angular](https://github.com/pubkey/rxdb/tree/master/examples/angular),
   ![vuejs](docs-src/files/icons/vuejs.png) [Vuejs](https://github.com/pubkey/rxdb/tree/master/examples/vue),
   ![react](docs-src/files/icons/react.png) [React](https://github.com/pubkey/rxdb/tree/master/examples/react),
   ![ionic](docs-src/files/icons/ionic.png) [Ionic2](https://github.com/pubkey/rxdb/tree/master/examples/ionic2) and all other modern JavaScript frameworks.

## Quickstart

### Installation:

```sh
npm install rxdb --save

# peerDependencies
npm install rxjs --save
```

### Import:

```javascript
import { 
  createRxDatabase
} from 'rxdb';


/**
 * For browsers, we use the dexie.js based storage
 * which stores data in IndexedDB.
 * In other JavaScript runtimes, we can use different storages.
 * @link https://rxdb.info/rx-storage.html
 */
import { getRxStorageDexie } from 'rxdb/plugins/dexie';

// create a database
const db = await createRxDatabase({
    // the name of the database
    name: 'heroesdb',
    storage: getRxStorageDexie(),
    // optional password, used to encrypt fields when defined in the schema
    password: 'myLongAndStupidPassword'
});

// create collections
await db.addCollections({
  heroes: {
    schema: mySchema
  }
});

// insert a document
await db.heroes.insert({ name: 'Bob' });                          
```

You can continue with the [quickstart here](https://rxdb.info/quickstart.html).


## Features (click to toggle)

<details>
<summary>
  <b>Subscribe to events, query results, documents and event single fields of a document</b>
  <p>

RxDB implements [rxjs](https://github.com/ReactiveX/rxjs) to make your data reactive.
This makes it easy to always show the real-time database-state in the dom without manually re-submitting your queries.</p>

</summary>

```javascript
db.heroes
  .find()
  .sort('name')
  .$ // <- returns observable of query
  .subscribe( docs => {
    myDomElement.innerHTML = docs
      .map(doc => '<li>' + doc.name + '</li>')
      .join();
  });
```

![reactive.gif](docs-src/files/reactive.gif)

</details>

<details>
<summary>
  <b>MultiWindow/Tab</b>
  <p>

RxDB supports multi tab/window usage out of the box. When data is changed at one browser tab/window or Node.js process, the change will automatically be broadcasted to all other tabs so that they can update the UI properly.

</p>
</summary>

![multiwindow.gif](docs-src/files/multiwindow.gif)

</details>

<details>
<summary>
  <b>Replication</b>
  <p>
    RxDB supports realtime replication with CouchDB compatible endpoints, or via GraphQL with custom endpoints. Also there is the replication primitives plugin that lets you implement replication via REST, Websockets, P2P or any other layer that can transmit data.
  </p>
</summary>

![sync.gif](docs-src/files/sync.gif)

</details>

<details>
<summary>
  <b>EventReduce</b>
  <p>
    One big benefit of having a realtime database is that big performance optimizations can be done when the database knows a query is observed and the updated results are needed continuously. RxDB internally uses the <a href="https://github.com/pubkey/event-reduce">Event-Reduce algorithm</a>. This makes sure that when you update/insert/remove documents,
    the query does not have to re-run over the whole database but the new results will be calculated from the events. This creates a huge performance-gain
    with zero cost.
  </p>
</summary>

### Use-Case-Example

Imagine you have a very big collection with many user-documents. At your page you want to display a toplist with users which have the most `points` and are currently logged in.
You create a query and subscribe to it.

```js
const query = usersCollection.find().where('loggedIn').eq(true).sort('points');
query.$.subscribe(users => {
    document.querySelector('body').innerHTML = users
        .reduce((prev, cur) => prev + cur.username+ '<br/>', '');
});
```

As you may detect, the query can take very long time to run, because you have thousands of users in the collection.
When a user now logs off, the whole query will re-run over the database which takes again very long.

```js
anyUser.loggedIn = false;
await anyUser.save();
```

But not with the EventReduce.
Now, when one user logs off, it will calculate the new results from the current results plus the RxChangeEvent. This often can be done in-memory without making IO-requests to the storage-engine. EventReduce not only works on subscribed queries, but also when you do multiple `.exec()`'s on the same query.

</details>

<details>
<summary>
  <b>Schema</b>
  <p>

Schemas are defined via [jsonschema](http://json-schema.org/) and are used to describe your data.</p>

</summary>

```javascript
const mySchema = {
    title: "hero schema",
    version: 0,                 // <- incremental version-number
    description: "describes a simple hero",
    primaryKey: 'name',         // <- 'name' is the primary key for the coollection, it must be unique, required and of the type string 
    type: "object",
    properties: {
        name: {
            type: "string",
            maxLength: 30
        },
        secret: {
            type: "string",
        },
        skills: {
            type: "array",
            maxItems: 5,
            uniqueItems: true,
            item: {
                type: "object",
                properties: {
                    name: {
                        type: "string"
                    },
                    damage: {
                        type: "number"
                    }
                }
            }
        }
    },
    required: ["color"],
    encrypted: ["secret"] // <- this means that the value of this field is stored encrypted
};
```

</details>

<details>
<summary>
  <b>Mango / Chained queries</b>
  <p>
RxDB can be queried by standard NoSQL mango queries, like you maybe know from other NoSQL Databases like <b>mongoDB</b>.

Also you can use the [mquery](https://github.com/aheckmann/mquery) api to create chained mango-queries.
  </p>
</summary>

```javascript

// normal query
myCollection.find({
  selector: {
    name: {
      $ne: 'Alice'
    },
    age: {
      $gt: 67
    }
  },
  sort: [{ age: 'desc' }],
  limit: 10
})

// chained query
myCollection
  .find()
  .where('name').ne('Alice')
  .where('age').gt(18).lt(67)
  .limit(10)
  .sort('-age')
  .exec().then( docs => {
    console.dir(docs);
  });
```

</details>

<details>
<summary>
  <b>Encryption</b>
  <p>

By setting a schema-field to `encrypted`, the value of this field will be stored in encryption-mode and can't be read without the password. Of course you can also encrypt nested objects. Example:</p>

</summary>

```json
{
  "title": "my schema",
  "properties": {
    "secret": {
      "type": "string",
      "encrypted": true
    }
  },
  "encrypted": [
    "secret"
  ]
}
```

</details>

<details>
<summary>
  <b>Adapters and Storage</b>
  <p>
    RxDB is not a self contained database. It is a wrapper arround another database that implements the `RxStorage` interface. At the moment you can either use PouchDB or <a href="https://rxdb.info/rx-storage-dexie.html">Dexie.js</a> or <a href="https://rxdb.info/rx-storage-lokijs.html">LokiJS</a> as underlaying storage. Each of them respectively has it's own adapters that can be swapped out, depending on your needs. For example you can use and IndexedDB based storage in the browser, and an SQLite storage in your hybrid app.
  </p>

</summary>

```ts

import { 
  createRxDatabase
} from 'rxdb';


/**
 * Create a PouchDB based RxDB instance
 * that stores data in IndexedDB
 */

import { 
  addPouchPlugin,
  getRxStoragePouch
} from 'rxdb/plugins/pouchdb';
addPouchPlugin(require('pouchdb-adapter-idb'));
const pouchBasedRxDB = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStoragePouch('idb')
});

/**
 * Create a LokiJS based RxDB instance
 * that stores data in IndexedDB
 */

import { 
  getRxStorageLoki
} from 'rxdb/plugins/lokijs';
const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');
const lokiBasedRxDB = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageLoki({
        adapter: new LokiIncrementalIndexedDBAdapter(),
        autoload: true,
        autosave: true,
        autosaveInterval: 500
    })
});

```

There is a [big ecosystem](https://rxdb.info/adapters.html) of adapters you can use.
    </details>

<details>
<summary>
  <b>Import / Export</b>
  <p>

RxDB lets you import and export the whole database or single collections into json-objects. This is helpful to trace bugs in your application or to move to a given state in your tests.</p>

</summary>

```js
// export a single collection
const jsonCol = await myCollection.dump();

// export the whole database
const jsonDB = await myDatabase.dump();

// import the dump to the collection
await emptyCollection.importDump(json);


// import the dump to the database
await emptyDatabase.importDump(json);
```

</details>

<details>
<summary>
  <b>Leader-Election</b>
  <p>

Imagine your website needs to get a piece of data from the server once every minute. To accomplish this task
you create a websocket or pull-interval. If your user now opens the site in 5 tabs parallel, it will run the interval
or create the socket 5 times. This is a waste of resources which can be solved by RxDB's LeaderElection.</p>

</summary>

```js
myRxDatabase.waitForLeadership()
  .then(() => {
      // this will only run when the instance becomes leader.
      mySocket = createWebSocket();
  });
```

In this example the leader is marked with the crown ♛

![reactive.gif](docs-src/files/leader-election.gif)

</details>

<details>
<summary>
  <b>Key-Compression</b>
  <p>

Depending on which adapter and in which environment you use RxDB, client-side storage is [limited](https://pouchdb.com/2014/10/26/10-things-i-learned-from-reading-and-writing-the-pouchdb-source.html) in some way or the other. To save disc-space, RxDB uses a schema based [keycompression](https://github.com/pubkey/jsonschema-key-compression) to minimize the size of saved documents. This saves about 40% of used storage.</p>

</summary>

Example:

```js
// when you save an object with big keys
await myCollection.insert({
  firstName: 'foo'
  lastName:  'bar'
  stupidLongKey: 5
});

// key compression will internally transform it to
{
  '|a': 'foo'
  '|b':  'bar'
  '|c': 5
}

// so instead of 46 chars, the compressed-version has only 28
// the compression works internally, so you can of course still access values via the original key.names and run normal queries.
console.log(myDoc.firstName);
// 'foo'
```

</details>

## Getting started

Get started now by [reading the docs](https://rxdb.info/quickstart.html) or exploring the [example-projects](./examples).


## Support and Contribute

- [Check out how you can contribute to this project](./docs-src/contribute.md).
- [Read this when you have found a bug](./orga/bug-checklist.md)
- [Buy access to the premium plugins](https://rxdb.info/premium.html)
