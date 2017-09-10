# Install

# npm

To install `rxdb` and its dependencies and save it to your `package.json`, run:

`npm i rxdb rxjs babel-polyfill --save`

# import

To import `rxdb`, add this to your javascript file:

```js
// es6
import RxDB from 'rxdb';

// es5
var rxdb = require('rxdb');
```

In most cases, you also have to import `babel-polyfill`. To do this, add the following to your javascript file:

```js
// es6
import 'babel-polyfill';

// es5
require('babel-polyfill');
```

-----------
If you are new to RxDB, you should continue [here](./RxDatabase.md)
