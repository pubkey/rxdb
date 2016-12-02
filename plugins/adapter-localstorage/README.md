# adapter-localstorage

This is a monkey-patch to prevent the caching of database-keys which destroys multi-window-support.


Use via:

``` npm i rxdb-adapter-localstorage --save ```

```js
  RxDB.plugin(require('rxdb-adapter-localstorage'));
```




#### TODO
- optimize performance by only refreshing keys when socket has something new
