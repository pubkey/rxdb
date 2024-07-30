# Bug checklist

This is a list of stuff which could be done to analyse a bug you have found in RxDB.


## Different browsers

If you use RxDB in the browser, try different browser and observe if the behavior changes.

## Different storages

Check if your problem still occurs when you change the RxStorage of the database.
If not done before, start trying with the memory storage.

## Disable EventReduce

RxDB uses an algorithm to optimize queries. 
You should disable that when creating the database and check if the behavior changes.

```ts
const db = await createRxDatabase({
    name,
    eventReduce: false,
});
```

## Disable KeyCompression

If you use the key-compression, disable it and check if the behavior changes.

## Disable multiInstance

By default, RxDB propagates events between different browser tabs of the same website. Disable this feature and check if the behavior of your bug changes.

```ts
const db = await createRxDatabase({
    name,
    multiInstance: false,
});
```
