# before next major release

This list contains things that have to be done but will create breaking changes.


### Rewrite prototype-merge

Each collection creates it's own constructor for RxDocuments.
This has a performance-benefit over using the Proxy-API which is also not supported in IE11.
To create the constructor, the collection merges prototypes from RxDocument, RxSchema and the ORM-functions.
The current implementation of this prototype-merging is very complicated and has hacky workarrounds to work with vue-devtools.
We should rewrite it to a single pure function that returns the constructor.
Instead of mergin the prototype into a single object, we should chain them together.

### Refactor data-migrator

 - The current implemetation does not use pouchdb's bulkDocs which is much faster
 - This could have been done in much less code which would be easier to uderstand



## Move rxjs into a plugin instead of having it internal
RxDB relies heavily on rxjs. This made it easy in the past to handle the data flow inside of RxDB and also created feature-rich interfaces for users when they want to observe data.
As long as you have rxjs in your project anyways, like you would have in an angular project, there is no problem with that.
As soon as a user has another data-handling library like redux or mobx, rxjs increases the build size by 22kb (5kb gzipped) and also adds the burden to map rxjs observables into the own state management.

The change would ensure that rxjs is no longer used inside of RxDB. And also there will be a RxDB-plugin which offers the same observable-features as there are today, but optional.
This would also allow us to create plugins for mobx or react-hooks in the future.

## Move pouchdb into a plugin
When I started creating RxDB, I used the best solution for a noSQL storage engine that I could find.
This was pouchdb. Not only because it is a very mature project, but also because it has adapters for so many environments.
The problem with pouchdb is the build size of 30kb (gziped, with indexeddb adapter) and also the performance decrease by it's overhead which comes from how it handles it's revision tree.

The change would ensure that the storage-engine is abstracted in a way that I can be swapped out by any other noSQL database out there. Users could then use different storage engines, depending if they want smaller builds or better performance. For example there are these out there:
- NeDB
- Minimongo
- Dexie.js
- [Worker-Pouch](https://github.com/pouchdb-community/worker-pouch). 
- Or any database with a changestream like Postgre, mongo etc.

This would also make it possible to use RxDB together with [NativeScript](https://www.nativescript.org/) in the future. 
Pouchdb will still be the default in the main build.


## Make RxDocument-acessors functions

Things like `RxDocument.deleted$` or `RxDocument.$` should be functions instead of getters.
We apply a hack atm which does not really work with typescript.
https://github.com/microsoft/TypeScript/issues/39254#issuecomment-649831793


## Make RxDcouments immutable
At the current version of RxDB, RxDocuments mutate themself when they recieve ChangeEvents from the database.
For example when you have a document where `name = 'foo'` and some update changes the state to `name = 'bar'` in the database, then the previous javascript-object will change it's own property to the have `doc.name === 'bar'`.
This feature is great when you use a RxDocument with some change-detection like in angular or vue templates. You can use document properties directly in the template and all updates will be reflected in the view, without having to use observables or subscriptions.

However this behavior is also confusing many times. When the state in the database is changed, it is not clear at which exact point of time the objects attribute changes. Also the self-mutating behavior created some problem with vue- and react-devtools because of how they clone objects.

Also, to not confuse with fast changes that happen directly after each other, the whole json-data-to-RxDocument-piple has to be synchronous. With the change, this can be async which will allow us to have async post-result-transformations, like an asynchronous encryption plugin (with the Web Crypto API) or also move things into a webworker.

The change would make all RxDocuments immutable. When you subscribe to a query and the same document is returned in the results, this will always be a new javascript object.

## Use immutable objects instead of deep-cloning stuff
RxDB often uses outgoing data also in the internals. For example the result of a query is not only send to the user, but also used inside of RxDB's query-change-detection. To ensure that mutation of the outgoing data is not changing internal stuff, which would cause strange bugs, outgoing data is always deep-cloned before. This is a common practice on many javascript libraries.
The problem is that deep-cloning big objects can be very CPU expensive.
So instead of doing a deep-clone, RxDB will assume that outgoing data is immutable.
If the users wants to modify that data, it has be be deep-cloned by the user.
To ensure immutability, RxDB will use [deep-freeze](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) in the dev-mode (about same expensive as deep clone). Also typescript will throw a build-time error because we will use `ReadonlyArray` and `readonly` to define outgoing data immutable.
In production-mode, there will be nothing that ensures immutability.

## server-plugin: overwrite defaults of pouchdbExpressOptions
The defaults of `pouchdbExpressOptions` from `RxDatabase.server()` require the user to configure stuff to not polute the projects folder with config and log files. We should overwrite the defaults to use `inMemoryConfig: true` and store the logs in the tmp folder.

## remove deprecated RxDocument.atomicSet()
`atomicSet` is deprecated in favor of `atomicPatch`. Remove the function in the next major release.

## remove RxDatabase.collection()
It was replaced by `RxDatabase.addCollections()` which is faster and better typed.

## rename wording of the json dump plugin
The words `dump()` and `importDump()` are confusing. Name it import/export or sth.

## set putAttachment(skipIfSame=true)

This should be the default. `skipIfSame=true`

# Maybe

## Use Proxy instead of getters/setter on RxDocument
Currently there is a hack invovled into the proxy-get-methods like `myDocument.firstName$` etc.
This had to be done because IE11 does not support the Proxy-Object (and there is no way to polyfill).
If we give up IE11-Support, we could use the proxy-object which would also allow to directly mutate arrays like described in [#561](https://github.com/pubkey/rxdb/issues/561). This would also give a performance-benefit.
