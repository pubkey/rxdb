---
title: Development Mode
slug: dev-mode.html
description: Enable checks & validations with RxDB Dev Mode. Ensure proper API use, readable errors, and schema validation during development. Avoid in production.
image: /headers/dev-mode.jpg
---

import {Steps} from '@site/src/components/steps';

# Dev Mode

The dev-mode plugin adds many checks and validations to RxDB.
This ensures that you use the RxDB API properly and so the dev-mode plugin should always be used when
using RxDB in development mode.

- Adds readable error messages.
- Ensures that `readonly` JavaScript objects are not accidentally mutated.
  - RxDB does not clone the data that you write, so the stored document shares its nested objects with your input. The dev-mode plugin deep-freezes these nested objects of each document that was written, after a write like `insert()`, [bulkInsert()](./rx-collection.md#bulkinsert), `upsert()`, or [importJSON()](./rx-collection.md#importjson). When you mutate them afterwards, JavaScript throws a `TypeError` in strict mode instead of silently changing the stored document.
- Adds validation check for validity of schemas, queries, [ORM](./orm.md) methods and document fields.
  - Notice that the `dev-mode` plugin does not perform schema checks against the data see [schema validation](./schema-validation.md) for that.

To also look at the stored data itself during development, mount the [database viewer](./db-viewer.md) which renders a full devtool over the running database.

:::warning
The dev-mode plugin will increase your build size and decrease the performance. It must **always** be used in development. You should **never** use it in production.
:::


<Steps>

### Import the dev-mode Plugin
```javascript
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { addRxPlugin } from 'rxdb/plugins/core';
```

## Add the Plugin to RxDB

```javascript
addRxPlugin(RxDBDevModePlugin);
```
</Steps>

## Usage with Node.js

```ts
async function createDb() {
    if (process.env.NODE_ENV !== "production") {
        await import('rxdb/plugins/dev-mode').then(
            module => addRxPlugin(module.RxDBDevModePlugin)
        );
    }
    const db = await createRxDatabase( /* ... */ );
}
```


## Usage with [Angular](./articles/angular-database.md)

```ts
import { isDevMode } from '@angular/core';

async function createDb() {
    if (isDevMode()){
        await import('rxdb/plugins/dev-mode').then(
            module => addRxPlugin(module.RxDBDevModePlugin)
        );
    }

    const db = await createRxDatabase( /* ... */ );
    // ...
}
```


## Usage with webpack

In the `webpack.config.js`:

```ts
module.exports = {
    entry: './src/index.ts',
    /* ... */
    plugins: [
        // set a global variable that can be accessed during runtime
        new webpack.DefinePlugin({ MODE: JSON.stringify("production") })
    ]
    /* ... */
};
```

In your source code:

```ts
declare var MODE: 'production' | 'development';

async function createDb() {
    if (MODE === 'development') {
        await import('rxdb/plugins/dev-mode').then(
            module => addRxPlugin(module.RxDBDevModePlugin)
        );
    }
    const db = await createRxDatabase( /* ... */ );
    // ...
}
```



## Disable the dev-mode warning

When the dev-mode is enabled, it will print a `console.warn()` message to the console so that you do not accidentally use the dev-mode in production. To disable this warning you can call the `disableWarnings()` function.

```ts
import { disableWarnings } from 'rxdb/plugins/dev-mode';
disableWarnings();
```


## Reset a collection when its schema changes

When you change the schema of a collection without increasing its `version`, RxDB throws the error [`DB6`](./errors.md#DB6) because the stored documents might not match the new schema. During development this gets in the way, for example when you switch between git branches that use different schemas.

To fix this, set [resetCollectionOnSchemaChange](./rx-database.md#resetcollectiononschemachange) to `true` when you create the [RxDatabase](./rx-database.md). The dev-mode then deletes the stored state of a collection whose schema has changed and creates the collection empty with the new schema.

## Disable the tracking iframe

When used in localhost and in the browser, the dev-mode plugin can add a tracking iframe to the DOM. This is used to track the effectiveness of marketing efforts of RxDB.
If you have [premium access](/premium/) and want to disable this iframe, you can call `setPremiumFlag()` before creating the database.

```js
import { setPremiumFlag } from 'rxdb-premium/plugins/shared';
setPremiumFlag();
```
