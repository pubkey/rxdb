<h1><a href="https://github.com/pubkey/rxdb">RxDB</a></h1>
<p>
  The <a href="http://offlinefirst.org/" target="_blank">offline-first</a> database for your next applications.
</p>


<h2>What is RxDB?</h2>
<p>RxDB is a Javascript-based database with..</p>

<table width="100%">
  <thead>
    <tr>
      <td>..these features..</td>
      <td></td>
      <td align="right">..for these plattforms</td>
    </tr>
  </thead>
  <tbody>
  <tr>
    <td>
      <ul>
        <li>Reactive (rxjs)</li>
        <br/>
        <li>Replication / Sync</li>
        <br/>
        <li>Schemas (jsonschema)</li>
        <br/>
        <li>Mango-Query (MongoDB)</li>
        <br/>
        <li>Encryption</li>
        <br/>
        <li>Level-Adapters</li>
        <br/>
        <li>Import/Export (.json)</li>
        <br/>
        <li>MultiWindow-Support</li>
      </ul>
    </td>
    <td>
      <img src="docs/files/arrow.png" width="200px"/>
    </td>
    <td colspan="3">

          <img src="docs/files/icons/chrome.png" width="20px" />
          <img src="docs/files/icons/firefox2.png" width="24px" />
          browsers
          <br /><br />
          <img src="docs/files/icons/nodejs.png" width="30px" />
          nodeJS
          <br /><br />
          <img src="docs/files/icons/angular.png" width="24px" />
          angular/ng2
          <br /><br />
          <img src="docs/files/icons/react.png" width="24px" />
          react
          <br /><br />
          <img src="docs/files/icons/ionic.ico" width="24px" />
          ionic <br /><br />

          <img src="docs/files/icons/cordova.png" width="24px" />
          cordova / phonegap
         <br /><br />
          <img src="docs/files/icons/nativescript.png" width="24px" />
          nativescript
     <br /><br />
          <img src="docs/files/icons/electron.png" width="24px" />
          electron
           <br />
    </td>
  </tr>
  </tbody>
</table>

<br><br>


## Menu
<ul>
  <li>
    <a href="#quickstart">Quickstart</a>
  </li>
  <li>
    <a href="#features">Features</a>
    <ul>
      <li><a href="#schema">Schema</a></li>
      <li><a href="#mango-query">Mango-Query</a></li>
      <li><a href="#reactive">Reactive</a></li>
      <li><a href="#multiwindowtab---support">MultiWindow/Tab</a></li>
      <li><a href="#replication">Replication</a></li>
      <li><a href="#encryption">Encryption</a></li>
      <li><a href="#level-adapters">Level-adapters</a></li>
      <li><a href="#import--export">Import / Export</a></li>
    </ul>
  </li>
  <li>
    <a href="#getting-started">Getting started</a>
    <ul>
      <li><a href="./docs/README.md">Read the docs</a></li>
      <li><a href="./examples">Example-projects</a></li>
    </ul>
  </li>
  <li>
    <a href="./docs/Contribute.md">How to contribute</a>
  </li>
</ul>


## Quickstart

Installation:

```sh
npm install rxdb --save
```

ES6:

```javascript
import * as RxDB from 'rxdb';
RxDB.create('heroesDB', 'websql', 'myLongAndStupidPassword', true)  // create database
.then(db => db.collection('mycollection', mySchema))                // create collection
.then(collection => collection.insert({name: 'Bob'}))               // insert document
```

ES5:

```javascript
var RxDB = require('rxdb');
RxDB.create('heroesDB', 'websql', 'myLongAndStupidPassword', true)    // create database
.then(function(db) {return db.collection('mycollection', mySchema);}) // create collection
.then(function(collection) {collection.insert({name: 'Bob'});})       // insert document
```

<h2>Features</h2>


<h3>Mango-Query</h3>
<p>To find data in your collection, you can use chained mango-queries, which you maybe know from <b>mongoDB</b> or <b>mongoose</b>. Example:</p>

```javascript
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


<h3>Reactive</h3>
<p>
  RxDB implements <a href="https://github.com/Reactive-Extensions/RxJS">rxjs</a> to make your data reactive.
  This makes it easy to always show the real-time database-state in the dom without manually re-submitting your queries.
</p>

```javascript
heroCollection
  .find()
  .sort('name')
  .$ // <- returns observable of query
  .subscribe( docs => {
    myDomElement.innerHTML = docs
    .map(doc => '<li>' + doc.get('name') + '</li>')
    .join();
  });
```
![reactive.gif](docs/files/reactive.gif)

<h3>MultiWindow/Tab - Support</h3>
<p>
  When two instances of RxDB use the same storage-engine, their state and action-stream will be broadcasted.
  This means with two browser-windows the change of window #1 will automatically affect window #2. This works completely serverless.
</p>

![multiwindow.gif](docs/files/multiwindow.gif)

<h3>Replication</h3>
<p>
  Because RxDB relies on glorious <a href="https://github.com/pouchdb/pouchdb">PouchDB</a>, it is easy to replicate
  the data between devices and servers. And yes, the changeEvents are also synced.
</p>

![sync.gif](docs/files/sync.gif)



<h3>Schema</h3>
<p>
  Schemas are defined via <a href="http://json-schema.org/">jsonschema</a> and are used to describe your data. Beside the jsonschema-keywords, you can also use <b>primary</b> and <b>encrypted</b>. Example:
</p>

```javascript
var mySchema = {
    title: "hero schema",
    description: "describes a simple hero",
    type: "object",
    properties: {
        name: {
            type: "string",
            primary: true       // <- this means: unique, required, string and will be used as '_id'
        },
        secret: {
            type: "string",
            encrypted: true     // <- this means that the value of this field is stored encrypted
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
    required: ["color"]
};
```

<h3>Encryption</h3>
<p>
By setting a schema-field to <code>encrypted: true</code>, the value of this field will be stored in encryption-mode and can't be read without the password. Of course you can also encrypt nested objects. Example:
</p>

```json
"secret": {
  "type": "string",
  "encrypted": true
}
```

<h3>Level-adapters</h3>
<p>
  The underlaying pouchdb can use different <a href="https://pouchdb.com/adapters.html">adapters</a> as storage engine. You can so use RxDB in different environments by just switching the adapter.
  For example you can use websql in the browser, localstorage in mobile-browsers and a leveldown-adapter in nodejs.
</p>

```js
// this requires the localstorage-adapter
RxDB.plugin(require('rxdb-adapter-localstorage'));
// this creates a database with the localstorage-adapter
RxDB.create('heroesDB', 'localstorage');
```

<ul>
  <li>
    <a href="./plugins/adapter-localstorage/">localstorage</a>
  </li>
  <li>
    <a href="https://www.npmjs.com/package/pouchdb-adapter-fruitdown">fruitdown</a>
  </li>
  <li>
    <a href="https://www.npmjs.com/package/pouchdb-adapter-memory">memory</a>
  </li>
  <li>
    <a href="https://www.npmjs.com/package/pouchdb-adapter-websql">websql</a>
  </li>
  <li>
    <a href="https://www.npmjs.com/package/pouchdb-adapter-http">http</a>
  </li>
  <li>
    <a href="https://github.com/Level/levelup/wiki/Modules#storage-back-ends">Or use any leveldown-adapter</a>
  </li>
</ul>

<h3>Import / Export</h3>
<p>
  RxDB lets you import and export the whole database or single collections into json-objects. This is helpful to trace bugs in your application or to move to a given state in your tests.
</p>
```js

// export a single collection
myCollection.dump()
  .then(json => {
    console.dir(json);
  });

// export the whole database
myDatabase.dump()
  .then(json => {
    console.dir(json);
  });

// import the dump to the collection
emptyCollection.importDump(json)
  .then(() => {
    console.log('done');
  });

// import the dump to the database
emptyDatabase.importDump(json)
  .then(() => {
    console.log('done');
  });
```

<h2>Getting started</h2>

Get started now by [reading the docs](./docs/README.md) or exploring the [example-projects](./examples).

<h2>Contribute</h2>
[Check out how you can contribute to this project](./docs/Contribute.md).
