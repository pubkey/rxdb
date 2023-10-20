# Dev Mode

The dev-mode plugin adds checks and validations to RxDB which provide use feedback during development, including: 

- Adds readable error messages in the console.
- Ensures that `readonly` JavaScript objects are not accidentally mutated.
- Checks for validity of schemas, queries, ORM methods and document fields (but note that data will not be validated against the scheme, see [schema validation](./schema-validation.md) for that).

**IMPORTANT**: The dev-mode plugin will increase your build size and decrease performance. It should **always** be used in development, but **never** use it in production.

```javascript
import { addRxPlugin } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);
```

## Usage with Node.js

```ts
async function createDb() {
    if (process.env.NODE_ENV !== "production") {
        await import('rxdb/plugins/dev-mode').then(
            module => addRxPlugin(module as any)
        );
    }
    const db = createRxDatabase( /* ... */ );
}
```


## Usage with Angular

```ts
import { isDevMode } from '@angular/core';

async function createDb() {
    if (isDevMode()){
        await import('rxdb/plugins/dev-mode').then(
            module => addRxPlugin(module as any)
        );
    }

    const db = createRxDatabase( /* ... */ );
    // ...
}

```
