---
title: Installation
slug: install.html
description: Learn how to install RxDB via npm, configure polyfills, and fix global variable errors in Angular or Webpack for a seamless setup.
image: /headers/install.jpg
---


# Install RxDB

## npm

To install the latest release of `rxdb` and its dependencies and save it to your `package.json`, run:

`npm i rxdb --save`

## peer-dependency

You also need to install the peer-dependency `rxjs` if you have not installed it before.

`npm i rxjs --save`

## polyfills

RxDB is coded with ES8 and transpiled to ES5. This means you have to install [polyfills](https://developer.mozilla.org/en-US/docs/Glossary/Polyfill) to support older browsers. For example you can use the babel-polyfills with:

`npm i @babel/polyfill --save`

If you need polyfills, you have to import them in your code.

```typescript
import '@babel/polyfill';
```

## Polyfill the `global` variable

When you use RxDB with [Angular](./articles/angular-database.md) or other **Webpack** based frameworks, you might get the error `Uncaught ReferenceError: global is not defined`.
This is because some dependencies of RxDB assume a Node.js-specific `global` variable that is not added to browser runtimes by some bundlers.
You have to add them manually, like we do [here](https://github.com/pubkey/rxdb/blob/master/examples/angular/src/polyfills.ts).

```ts
(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
};
```

## Project Setup and Configuration

In the [examples](https://github.com/pubkey/rxdb/tree/master/examples) folder you can find CI tested projects for different frameworks and use cases, while in the [/config](https://github.com/pubkey/rxdb/tree/master/config) folder base configuration files for Webpack, Rollup, Mocha, Karma, TypeScript are exposed.

Consult [package.json](https://github.com/pubkey/rxdb/blob/master/package.json) for the versions of the packages supported.

## Installing the latest RxDB build

If you need the latest development state of RxDB, add it as git dependency into your `package.json`.

```json
  "dependencies": {
      "rxdb": "git+https://git@github.com/pubkey/rxdb.git#commitHash"
  }
```

Replace `commitHash` with the hash of the latest [build-commit](https://github.com/pubkey/rxdb/search?q=build&type=Commits).

## Import

To import `rxdb`, add this to your JavaScript file to import the default bundle that contains the RxDB core:

```typescript
import {
  createRxDatabase,       // ./rx-database.md
  /* ... */
} from 'rxdb';
```
