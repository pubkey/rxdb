# Install

## npm

To install the latest release of `rxdb` and its dependencies and save it to your `package.json`, run:

`npm i rxdb --save`

## peer-dependency

You also need to install the peer-dependency `rxjs` if you have not installed it before.

`npm i rxjs --save`

## polyfills

RxDB is coded with es8 and transpiled to es5\. This means you have to install [polyfills](https://developer.mozilla.org/en-US/docs/Glossary/Polyfill) to support older browsers. For example you can use the babel-polyfills with:

`npm i @babel/polyfill --save`

If you need polyfills, you have to import them in your code.

```typescript
import '@babel/polyfill';
```

## polyfill global

When you use RxDB with **angular** or other **webpack** based frameworks, you might get the error <span style="color: red;">Uncaught ReferenceError: global is not defined</span>. This is because pouchdb assumes a nodejs-specific global variable that is not added to browser runtimes by some bundlers.
You have to add them by your own, like we do [here](https://github.com/pubkey/rxdb/blob/master/examples/angular/src/polyfills.ts).

```ts
(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
};
```

## Latest

If you need the latest development state of RxDB, add it as git-dependency into your `package.json`.

```json
  "dependencies": {
      "rxdb": "git+https://git@github.com/pubkey/rxdb.git#commitHash"
  }
```

Replace `commitHash` with the hash of the latest [build-commit](https://github.com/pubkey/rxdb/search?q=build&type=Commits).

## Import

To import `rxdb`, add this to your javascript file:

```typescript
import {
  createRxDatabase,
  RxDatabase
  /* ... */
} from 'rxdb';
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-database.md)
