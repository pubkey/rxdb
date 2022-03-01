# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.


### Rewrite prototype-merge

Each collection creates it's own constructor for RxDocuments.
This has a performance-benefit over using the Proxy-API which is also not supported in IE11.
To create the constructor, the collection merges prototypes from RxDocument, RxSchema and the ORM-functions.
The current implementation of this prototype-merging is very complicated and has hacky workarrounds to work with vue-devtools.
We should rewrite it to a single pure function that returns the constructor.
Instead of mergin the prototype into a single object, we should chain them together.

### Refactor data-migrator

 - The current implemetation does not use pouchdb's bulkDocs which is much faster.
 - This could have been done in much less code which would be easier to understand.
 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.
 

## Move rxjs into a plugin instead of having it internal
RxDB relies heavily on rxjs. This made it easy in the past to handle the data flow inside of RxDB and also created feature-rich interfaces for users when they want to observe data.
As long as you have rxjs in your project anyways, like you would have in an angular project, there is no problem with that.
As soon as a user has another data-handling library like redux or mobx, rxjs increases the build size by 22kb (5kb gzipped) and also adds the burden to map rxjs observables into the own state management.

The change would ensure that rxjs is no longer used inside of RxDB. And also there will be a RxDB-plugin which offers the same observable-features as there are today, but optional.
This would also allow us to create plugins for mobx or react-hooks in the future.

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

## Use exports field in package.json

See [#3422](https://github.com/pubkey/rxdb/issues/3422)

Use the [exports](https://webpack.js.org/guides/package-exports/) field in the `package.json` instead of the other fields like `main` or `jsnext:main`.
Also we no longer need a package.json for each plugin in the `/plugins` folder, instead add the plugins to the exports field.
Ensure that it works with typescript. Check the rxjs repo and find out how they did this.

Rename the paths in the `exports` field in the `package.json` so that users can do `import {} from 'rxdb/core'` instead of the current `import {} from 'rxdb/plugins/core'`.

# Move _rev, _deleted and _attachments into _meta

From version `12.0.0` on, all document data is stored with an `_meta` field that can contain various flags and other values. This makes it easier for plugins to remember stuff that belongs to the document.
In the future, the other meta field like `_rev`, `_deleted` and `_attachments` will be moved from the root level to the `_meta` field. This is **not** done directly in release `12.0.0` to ensure that there is a migration path.

# Maybe

## Use Proxy instead of getters/setter on RxDocument
Currently there is a hack invovled into the proxy-get-methods like `myDocument.firstName$` etc.
This had to be done because IE11 does not support the Proxy-Object (and there is no way to polyfill).
If we give up IE11-Support, we could use the proxy-object which would also allow to directly mutate arrays like described in [#561](https://github.com/pubkey/rxdb/issues/561). This would also give a performance-benefit.
