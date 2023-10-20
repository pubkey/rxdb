# Installation

## npm

To install the latest release of `rxdb` and its dependencies run:

`npm install rxjs rxdb --save`

## polyfills

RxDB is written in ES8 and transpiled to ES5. This means you have to install [polyfills](https://developer.mozilla.org/en-US/docs/Glossary/Polyfill) to support older browsers. For example you can use the babel-polyfills with:

`npm i @babel/polyfill --save`

If you need polyfills, you have to import them in your code.

```typescript
import '@babel/polyfill';
```

## Polyfill the `global` variable

When you use RxDB with **angular** or other **webpack** based frameworks, you might get the error <span style="color: red;">Uncaught ReferenceError: global is not defined</span>. This is because some dependencies of RxDB assume a Node.js-specific `global` variable that is not added to browser runtimes by some bundlers.
You have to add them yourself, like we do [here](https://github.com/pubkey/rxdb/blob/master/examples/angular/src/polyfills.ts).

```ts
(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
};
```

## Project Setup and Configuration

In the [examples](https://github.com/pubkey/rxdb/tree/master/examples) folder you can find CI tested projects for different frameworks and use cases, while in the [/config](https://github.com/pubkey/rxdb/tree/master/config) folder base configuration files for Webpack, Rollup, Mocha, Karma, and Typescript are exposed.

Consult [package.json](https://github.com/pubkey/rxdb/blob/master/package.json) for the versions of the packages supported.

## Using the latest version

If you need the latest development state of RxDB, add it as a git-dependency in your `package.json`.

```json
  "dependencies": {
      "rxdb": "git+https://git@github.com/pubkey/rxdb.git#commitHash"
  }
```

Replace `commitHash` with the hash of the latest [build-commit](https://github.com/pubkey/rxdb/search?q=build&type=Commits).