# Install

# npm

To install rxdb and save it to your package.json, run

`npm i rxdb --save`

If you don't have es7-polyfills, you habe to add them by also installing

`npm i babel-polyfill --save`

If you don't have rxjs installed, you habe to add it by also installing

`npm i rxjs --save`

# import

To import rxdb, add this to your js-file

```js
// es6
import * as RxDB from 'rxdb';

// es5
var rxdb = require('rxdb');
```


If you dont have polyfills, also import `babel-polyfill`:

```js
// es6
import 'babel-polyfill';

// es5
require('babel-polyfill');
```


-----------
If you are new to RxDB, you should continue [here](./RxDatabase.md)
