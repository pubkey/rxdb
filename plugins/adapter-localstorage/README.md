# adapter-localstorage

This is a monkey-patch to prevent the caching of database-keys which destroys multi-window-support.

The monkey-patch is located [here](./localstorage-down/lib/localstorage.js#L44)

Use via:

``` npm i rxdb-adapter-localstorage --save ```

```js
  RxDB.plugin(require('rxdb-adapter-localstorage'));
```




#### TODO
- optimize performance by only refreshing keys when socket has something new
