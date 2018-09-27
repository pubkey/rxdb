# Install

## npm

To install the latest release of `rxdb` and its dependencies and save it to your `package.json`, run:

`npm i rxdb --save`

## peer-dependency

You also need to install the peer-dependency `rxjs` if you not have installed it before.

`npm i rxjs --save`

## polyfills

RxDB is coded with es8 and transpiled to es5\. This means you have to install [polyfills](https://en.wikipedia.org/wiki/Polyfill_(programming)) to support older browsers. For example you can use the babel-polyfills with:

`npm i babel-polyfill --save`

## Latest

If you need the latest develop-state of RxDB, add it as git-dependency into your `package.json`.

```json
  "dependencies": {
      "rxdb": "git+https://git@github.com/pubkey/rxdb.git#commitHash"
  }
```

Replace `commitHash` with the hash of the latest [build-commit](https://github.com/pubkey/rxdb/search?q=build&type=Commits).

## Import

To import `rxdb`, add this to your javascript file:

```javascript
// es6
import RxDB from 'rxdb';

// es5
var RxDB = require('rxdb');
```

If you have not included es8-polyfills, you also have to import `babel-polyfill`.

```javascript
// es6
import 'babel-polyfill';

// es5
require('babel-polyfill');
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-database.md)
