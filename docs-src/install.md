# Install

## npm

To install the latest release of `rxdb` and its dependencies and save it to your `package.json`, run:

`npm i rxdb --save`

## peer-dependency

You also need to install the peer-dependency `rxjs` if you not have installed it before.

`npm i rxjs --save`

## polyfills

RxDB is coded with es8 and transpiled to es5\. This means you have to install polyfills to support older browsers.

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
var rxdb = require('rxdb');
```

If you have not included es8-polyfills, you also have to import `babel-polyfill`.

```javascript
// es6
import 'babel-polyfill';

// es5
require('babel-polyfill');
```

## rxjs

To reduce the build-size, RxDB is using rxjs's [lettable-operators](https://github.com/ReactiveX/rxjs/blob/master/doc/lettable-operators.md). This means that by default only some parts of rxjs are included into RxDB. If you want to use additional operators, you either have to require the whole rxjs-lib, or also use the lettable-operators. Another alternative is to cherry-pick the needed operators.

```javascript
// full import
import 'rxjs'; // es6
require('rxjs'); // es5

// lettable
import { Subject } from 'rxjs/Subject';
import { filter } from 'rxjs/operators/filter';

// cherry-pick
import 'rxjs/add/operator/map';		
import 'rxjs/add/operator/mergeMap';		
import 'rxjs/add/operator/filter';		
import 'rxjs/add/operator/first';
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-database.md)
