# How RxDB embraces JSON Schema to build its NoSQL Database

[RxDB](https://rxdb.info/) is a NoSQL database designed primarily for client-side JavaScript applications, focusing on the [offline-first approach](https://rxdb.info/offline-first.html), multi-tab operations, and data replication. It seamlessly integrates with modern web and mobile app frameworks, supports various storage backends, and provides a plugin-based architecture to handle encryption, compression, type generation, and more.

One of RxDB's standout architectural choices is its reliance on JSON Schema to define data models for documents in collections. Instead of inventing a custom schema language, RxDB adopts a standard that is already well-established in the broader JavaScript community. By doing so, RxDB solves several major hurdles that often arise when developers are introduced to new databases:

- **Familiarity**: Most JavaScript developers have already encountered JSON Schema, either via OpenAPI or other tooling. Thus, they can quickly understand and adopt RxDB's schemas without investing time in learning a new schema language.

- **Tooling ecosystem**: JSON Schema boasts a robust set of libraries, validators, and code generators. RxDB leverages these rather than maintaining its own schema validation library, giving teams the freedom to pick what works best for them.

- **Long-term maintainability**: Because JSON Schema is recognized as a standard, future updates and ecosystem support are more reliable than a custom, one-off solution.


By building on JSON Schema, RxDB has a foundation that makes schema design, data validation, and typing straightforward, making it easier for developers to build robust, safe applications in production.


<center>
    <a href="https://rxdb.info/">
        <img src="https://rxdb.info/files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>

## How RxDB uses JSON Schema


While RxDB adopts the JSON Schema Core and Validation specifications, it also extends it to introduce RxDB-specific functionality. Like in other NoSQL databases, you can manually define which fields to encrypt, which ones to index, and how to interpret specific fields for queries. RxDB enables these configurations as custom JSON Schema keywords:

- `primaryKey`: Specifies which field in the document serves as the primary key.
- `indexes`: Defines which fields (or combination of fields) RxDB indexes. You can have single-field indexes or compound indexes.
- `version`: Indicates the version of the schema. Whenever you change your schema, you must increment this version so RxDB can handle migrations or other adjustments. This is important because data migration on a client-side database can be tricky when you have many clients out there that update your app at different points in time.
- `encryption`: Specifies which fields should be stored in an encrypted form. This is useful for sensitive data that you do not want to store in plaintext on the client's device.
- `keyCompression`: Can be set to `true` to enable the key-compression plugin.

RxDB supports a [compression plugin](https://rxdb.info/key-compression.html) that uses a "compression table." This is essentially a lookup table derived from your JSON Schema which assigns shorter keys or transforms fields so that the stored data becomes more compact. By analyzing the schema, the plugin understands which fields appear repeatedly and can replace them with shorter tokens. Remarkably, RxDB can still query the data in its compressed form. This leads to performance improvements, especially in environments where local storage space is limited.

Below is a sample RxDB schema that demonstrates how standard JSON Schema vocabularies combine with RxDB's custom extensions:

```ts
const mySchema = {
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        },
        secret: {
            type: 'string'
        }
    },
    additionalProperties: false,
    required: ['firstName', 'lastName', 'id'],
    // RxDB specific fields:
    primaryKey: 'id',
    version: 0,
    keyCompression: true,
    indexes: [
        'firstName', // single-field index
        ['firstName', 'lastName'] // compound index
    ],
    encrypted: ['secret']
}
```

## Restrictions

Although RxDB aims to remain fully spec compliant with JSON Schema, it does impose some extra restrictions:

The schema requires top-level field names to match the regex `^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]$`. This rule ensures that property names are valid JavaScript identifiers.

At the top level of the schema, `additionalProperties` must be set to `false`. This prevents silently introducing new fields that could potentially clash with built-in RxDocument methods (like `.toJSON()`). By making you list out each property, RxDB ensures you can't unknowingly overwrite or conflict with standard methods.

RxDB does not allow `$ref` to other files or external schema fragments or `$dynamicRef`. The goal is to keep schema loading fast and self-contained. If a schema needs to be composed of multiple parts, you must combine them at build time or otherwise ensure they are merged before passing them to RxDB at runtime. This approach also prevents any network calls or asynchronous fetches that could slow down your application's startup.


## Inferring Document Types with TypeScript

JSON Schema is not just for validation and structural guarantees, it can also help generate or infer TypeScript types. In many projects, developers rely on tools like [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript) to produce `.d.ts` files or interface definitions from schema files at build time. However, that requires a separate build step, which slows down your workflow.

To improve developer experience, RxDB offers a [built-in way](https://rxdb.info/tutorials/typescript.html) to infer the document's TypeScript type from the schema during runtime. This is helpful because you get immediate feedback in your IDE: As soon as you update the schema, TypeScript picks up the changes. You'll see type errors in your code if you attempt to use fields that are no longer valid or if you forget to include newly required fields.

Below is an example on how to interfere the TypeScript type of a document from its JSON-schema:

```ts
import {
    toTypedRxJsonSchema,
    ExtractDocumentTypeFromTypedRxJsonSchema,
    RxJsonSchema,
    RxCollection
} from 'rxdb';

export const heroSchemaLiteral = {
    title: 'hero schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        /* ...other fields... */
    },
    required: ['firstName', 'lastName', 'passportId'],
    indexes: ['firstName']
} as const;

// Convert the literal object to a typed schema
const schemaTyped = toTypedRxJsonSchema(heroSchemaLiteral);

// Extract the document type from the typed schema
export type HeroDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;

// Create a typed RxJsonSchema
export const heroSchema: RxJsonSchema<HeroDocType> = heroSchemaLiteral;

// Example usage: create a typed collection
const myCollection: RxCollection<HeroDocType> = db.heroes;
```


## Different JSON Schema Validators

In order to validate whether a given document complies with the schema, RxDB uses pluggable validators. Historically, RxDB supports/supported:

- [ajv](https://ajv.js.org/)
- [z-schema](https://github.com/zaggino/z-schema)
- [is-my-json-valid](https://github.com/mafintosh/is-my-json-valid) (now deprecated in RxDB because it incorrectly handles large and decimal numbers)

No single validator is perfect; each has its trade-offs in performance, build size, and correctness edge cases. Some libraries rely on `eval()` or `new Function`, which can break in strict Content-Security-Policy (CSP) environments. Others have issues with large integers. RxDB encourages you to pick a validator that matches your app's needs and environment constraints.

Note that RxDB itself does not define a specific JSON Schema dialect. Instead, the range of supported dialects is determined by the JSON Schema validation plugin in use.

One important consideration is that each validator has a unique format for its **error messages**. If your application inspects validation errors and makes decisions (e.g., showing descriptive warnings to the user), be aware that switching validators later can require extensive code changes. In theory this is solved by the JSON Schema specification by the use of the [Standard Output](https://json-schema.org/draft/2020-12/json-schema-core#name-output-formatting) format, but this is not implemented in the listed schema validators.

## Performance Comparison of Validators

Performance is a critical factor in deciding whether to validate documents at runtime, especially in production environments. The following tables illustrate a basic comparison of initialization time (time-to-first-insert) and bulk insertion speed for different validators on two RxDB storages

The RxDB team ran performance benchmarks using two storage options on an Ubuntu 24.04 machine with Chrome version `131.0.6778.85`. The testing machine has 32 core `13th Gen Intel(R) Core(TM) i9-13900HX` CPU.

Dexie Storage (based on IndexedDB in the browser):

| **Dexie Storage** | Time to First insert | Insert 3000 documents |
| ----------------- | :------------------: | --------------------: |
| no validator      |        68 ms         |                213 ms |
| ajv               |        67 ms         |                216 ms |
| z-schema          |        71 ms         |                230 ms |

On Dexie Storage, the difference in time-to-first-insert is negligible, and inserting thousands of documents also shows only a modest increase in latency when using a validator. The overall overhead for 3000 inserts remains fairly small (a difference of tens of milliseconds).


Memory Storage: stores everything in memory for extremely fast reads and writes, with no persistence by default. Often used with the RxDB memory-mapped plugin that processes data in memory an later persists to disc in background:

| **Memory Storage** | Time to First insert | Insert 3000 documents |
| ------------------ | :------------------: | --------------------: |
| no validator       |       1.15 ms        |                0.8 ms |
| ajv                |       3.05 ms        |                2.7 ms |
| z-schema           |        0.9 ms        |                 18 ms |

For the Memory Storage, you see a wider variance. Although z-schema has a faster startup (time-to-first-insert) than ajv, it becomes much slower at continuous inserts (18 ms vs. 2.7 ms). This discrepancy might not matter if you rarely insert documents, but it can become significant if you have high-volume write operations.

Including a validator library also increases your JavaScript bundle size. Here's how it breaks down (minified + gzip):

| **Build Size** (minified+gzip) | Build Size (dexie) | Build Size (memory) |
| ------------------------------ | :----------------: | ------------------: |
| no validator                   |      73103 B       |             39976 B |
| ajv                            |      106135 B      |             72773 B |
| z-schema                       |      125186 B      |             91882 B |

Including a validator can substantially increase your final bundle size. For large single-page applications, an extra 30-50 KB or more of JavaScript could influence startup times, especially for users on slow networks.



## Should JSON Schema Validation Be Used in Production?

Many teams limit JSON Schema validation to development builds to avoid performance overhead in production. However, if your application deals with highly sensitive or mission-critical data, keeping validation enabled ensures data integrity and can prevent costly errors, despite the added CPU and bundle-size costs. Ultimately, the choice depends on your performance targets and  the risk of invalid data.

### Running the Validation in a WebWorker

If you must keep validation enabled in production but you have to ensure that your UI does not lack during validation, you might consider the [RxDB WebWorker plugin](https://rxdb.info/rx-storage-worker.html). This plugin runs the RxDB storage & validation in a separate Web Worker, offloading the main UI thread. While it won't reduce the absolute time spent on validation, it can help maintain a smooth UI by preventing blocking operations on the main thread.


## Learnings

Over time, RxDB has evolved its usage of JSON Schema, learning from real production experiences and feedback from the community. Here are some key takeaways:

- Avoid inlined `required` fields: In older JSON Schema dialects such as Draft 3, it was acceptable to define `"required": true` directly inside the property definition. However, more recent dialects expect required to be declared as an `array` at the parent object level. If you're using a validator based on newer specs, place your required fields in the parent-level array. If you intentionally stick to Draft 3, inlined required is still valid, but it may cause confusion if you switch to a newer validator or tool later on.

- Keep Custom Fields at the Top Level: Originally, RxDB allowed custom definitions (`index`, `encrypted`, etc.) to appear deeply nested. This caused performance hits because the library had to traverse large schema objects to find them. By placing these fields at the top level, RxDB can parse and apply them much faster, improving startup times.

- Error messages are not standardized: Each validator produces a different structure for error messages. If your app logic inspects these errors, you risk partial or complete rewrites if you ever switch validators. Decide early on which validator meets your needs and plan on sticking with it long-term. This might be solved in the future when all validators support the [standard output formatting](https://json-schema.org/draft/2020-12/json-schema-core#name-output-formatting).


## Follow Up

Using JSON Schema in RxDB has greatly simplified data definitions, tooling integration, and type inference. Although some restrictions and performance considerations come into play, the overall developer experience is significantly improved by using a well-known standard rather than reinventing the wheel.

For more information on RxDB, including further details on schema extensions and advanced plugins, check out the [official RxDB documentation](https://rxdb.info/quickstart.html).
