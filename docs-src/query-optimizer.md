# Query Optimizer

The query optimizer can be used to determine which index is the best to use for a given query.
Because RxDB is used in client side applications, it cannot do any background checks or measurements to optimizer the query plan because that would cause significant performance problems.

**NOTICE:** The query optimizer is part of the [RxDB Premium](./premium.md) plugin that must be purchased. It is not part of the default RxDB module.

## Usage

```ts
import {
    findBestIndex
} from 'rxdb-premium/plugins/query-optimizer';

import { 
    getRxStorageIndexedDB
} from 'rxdb-premium/plugins/indexeddb';

const bestIndexes = await findBestIndex({
    schema: myRxJsonSchema,
    /**
     * In this example we use the IndexedDB RxStorage,
     * but any other storage can be used for testing.
     */
    storage: getRxStorageIndexedDB(),
    /**
     * Multiple queries can be optimized at the same time
     * which decreases the overall runtime.
     */
    queries: {
        /**
         * Queries can be mapped by a query id,
         * here we use myFirstQuery as query id.
         */
        myFirstQuery: {
            selector: {
                age: {
                    $gt: 10
                }
            },
        },
        mySecondQuery: {
            selector: {
                age: {
                    $gt: 10
                },
                lastName: {
                    $eq: 'Nakamoto'
                }
            },
        }
    },
    testData: [/** data for the documents. **/]
});

```



## Important details

- This is a build time tool. You should use it to find the best indexes for your queries during **build time**. Then you store these results and you application can use the best indexes during **run time**.

- It makes no sense to run time optimization with a different `RxStorage` (+settings) that what you use in production. The result of the query optimizer is heavily dependent on the RxStorage an JavaScript runtime. For example it makes no sense to run the optimization in Node.js and then use the optimized indexes in the browser.

- It is very important the you use **production like** `testData`. Finding the best index heavily depends on data distribution and amount of stored/queried documents. For example if you store and query users with an `age` field, it makes no sense to just use a random number for the age because in production the `age` of your users is not equally distributed.

- The higher you set `runs`, the more test cycles will be performed and the more **significant** will be the time measurements which leads to a better index selection.

